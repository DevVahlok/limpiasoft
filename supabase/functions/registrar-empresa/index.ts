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

  let body: { nombreEmpresa?: string; nombreCompleto?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body JSON inválido" }, 400);
  }

  const nombreEmpresa = body.nombreEmpresa?.trim();
  const nombreCompleto = body.nombreCompleto?.trim();
  const pin = body.pin?.trim() || "0000";

  if (!nombreEmpresa || !nombreCompleto) {
    return json({ error: "nombreEmpresa y nombreCompleto son obligatorios" }, 400);
  }
  if (!/^\d{4}$/.test(pin)) {
    return json({ error: "El PIN debe tener 4 dígitos" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const username = await usernameUnico(adminClient, nombreCompleto);

  // La contraseña real que ve Supabase Auth es un PIN de 4 dígitos con un prefijo fijo
  // solo para cumplir el mínimo de longitud; la seguridad real es la del PIN en sí (decisión
  // de producto: personal de limpieza, login rápido con usuario+PIN, sin email real).
  const { data: created, error } = await adminClient.auth.admin.createUser({
    email: `${username}@${DOMINIO}`,
    password: `lsft-${pin}`,
    email_confirm: true,
    user_metadata: {
      tipo: "registro_empresa",
      nombre_empresa: nombreEmpresa,
      nombre_completo: nombreCompleto,
      username,
    },
  });

  if (error || !created.user) {
    return json({ error: error?.message ?? "No se pudo crear la empresa" }, 400);
  }

  return json({ username });
});
