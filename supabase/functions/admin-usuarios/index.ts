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

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) {
    return json({ error: "Token inválido" }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: caller } = await adminClient
    .from("app_admins")
    .select("id")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (!caller) {
    return json({ error: "Solo un desarrollador puede gestionar usuarios" }, 403);
  }

  let body: {
    op?: string;
    id?: string;
    empresa_id?: string;
    nombre_completo?: string;
    telefono?: string;
    rol?: string;
    activo?: boolean;
    pin?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body JSON inválido" }, 400);
  }

  switch (body.op) {
    case "list": {
      if (!body.empresa_id) return json({ error: "empresa_id es obligatorio" }, 400);
      const { data, error } = await adminClient
        .from("profiles")
        .select("*")
        .eq("empresa_id", body.empresa_id)
        .order("rol", { ascending: false })
        .order("nombre_completo");
      if (error) return json({ error: error.message }, 400);
      return json({ usuarios: data });
    }

    case "create": {
      const { empresa_id, nombre_completo } = body;
      const rol = body.rol === "jefe" ? "jefe" : "empleado";
      const pin = body.pin?.trim() || "0000";
      if (!empresa_id || !nombre_completo) {
        return json({ error: "empresa_id y nombre_completo son obligatorios" }, 400);
      }
      if (!/^\d{4}$/.test(pin)) {
        return json({ error: "El PIN debe tener 4 dígitos" }, 400);
      }

      const username = await usernameUnico(adminClient, nombre_completo);
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email: `${username}@${DOMINIO}`,
        password: `lsft-${pin}`,
        email_confirm: true,
        app_metadata: { empresa_id, rol },
        user_metadata: { nombre_completo, username },
      });
      if (createError || !created.user) {
        return json({ error: createError?.message ?? "No se pudo crear el usuario" }, 400);
      }

      if (body.telefono) {
        await adminClient.from("profiles").update({ telefono: body.telefono }).eq("id", created.user.id);
      }

      return json({ id: created.user.id, username });
    }

    case "update": {
      if (!body.id) return json({ error: "id es obligatorio" }, 400);
      const cambios: Record<string, unknown> = {};
      if (body.nombre_completo !== undefined) cambios.nombre_completo = body.nombre_completo;
      if (body.telefono !== undefined) cambios.telefono = body.telefono;
      if (body.rol !== undefined) cambios.rol = body.rol === "jefe" ? "jefe" : "empleado";
      if (body.activo !== undefined) cambios.activo = body.activo;

      const { data, error } = await adminClient.from("profiles").update(cambios).eq("id", body.id).select().single();
      if (error) return json({ error: error.message }, 400);
      return json({ usuario: data });
    }

    case "reset_pin": {
      if (!body.id) return json({ error: "id es obligatorio" }, 400);
      const pin = body.pin?.trim() || "0000";
      if (!/^\d{4}$/.test(pin)) {
        return json({ error: "El PIN debe tener 4 dígitos" }, 400);
      }
      const { error } = await adminClient.auth.admin.updateUserById(body.id, { password: `lsft-${pin}` });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    case "delete": {
      if (!body.id) return json({ error: "id es obligatorio" }, 400);
      const { error } = await adminClient.auth.admin.deleteUser(body.id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    default:
      return json({ error: "op desconocida" }, 400);
  }
});
