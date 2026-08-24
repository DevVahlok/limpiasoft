import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DOMINIO = "limpiasoft.app";

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function usernameBase(nombreCompleto: string): string {
  const partes = nombreCompleto.trim().split(/\s+/).map(normalizar).filter(Boolean);
  if (partes.length === 0) return "usuario";
  if (partes.length === 1) return partes[0];
  return `${partes[0]}.${partes[partes.length - 1]}`;
}

// deno-lint-ignore no-explicit-any
async function usernameUnico(adminClient: any, nombreCompleto: string): Promise<string> {
  const base = usernameBase(nombreCompleto);
  let candidato = base;
  let sufijo = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await adminClient.from("profiles").select("id").eq("username", candidato).maybeSingle();
    if (!data) return candidato;
    candidato = `${base}${sufijo}`;
    sufijo++;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Falta cabecera Authorization" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Cliente scoped al llamante (respeta RLS): sirve para averiguar quién es y su rol real,
  // sin fiarnos de nada que venga en el body de la petición.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) {
    return json({ error: "Token inválido" }, 401);
  }

  const { data: callerProfile, error: profileError } = await callerClient
    .from("profiles")
    .select("empresa_id, rol")
    .eq("id", userData.user.id)
    .single();

  if (profileError || !callerProfile || callerProfile.rol !== "jefe") {
    return json({ error: "Solo un jefe puede dar de alta empleados" }, 403);
  }

  let body: { nombre_completo?: string; telefono?: string; tarifa_hora?: number; pin?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body JSON inválido" }, 400);
  }

  const { nombre_completo, telefono, tarifa_hora } = body;
  const pin = body.pin?.trim() || "0000";
  if (!nombre_completo) {
    return json({ error: "nombre_completo es obligatorio" }, 400);
  }
  if (!/^\d{4}$/.test(pin)) {
    return json({ error: "El PIN debe tener 4 dígitos" }, 400);
  }

  const empresaId = callerProfile.empresa_id;

  // Cliente con service_role: únicamente para crear el usuario Auth, comprobar unicidad del
  // username y su tarifa inicial; el resto de la función ya validó el permiso arriba.
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const username = await usernameUnico(adminClient, nombre_completo);

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: `${username}@${DOMINIO}`,
    password: `lsft-${pin}`,
    email_confirm: true,
    app_metadata: { empresa_id: empresaId, rol: "empleado" },
    user_metadata: { nombre_completo, username },
  });

  if (createError || !created.user) {
    return json({ error: createError?.message ?? "No se pudo crear el usuario" }, 400);
  }

  if (telefono) {
    await adminClient.from("profiles").update({ telefono }).eq("id", created.user.id);
  }

  if (typeof tarifa_hora === "number") {
    await adminClient.from("tarifas").insert({
      empresa_id: empresaId,
      empleado_id: created.user.id,
      tarifa_hora,
    });
  }

  return json({ id: created.user.id, username });
});
