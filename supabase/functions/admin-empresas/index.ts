import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
    return json({ error: "Solo un desarrollador puede gestionar empresas" }, 403);
  }

  let body: { op?: string; id?: string; nombre?: string; nif?: string; pausada?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body JSON inválido" }, 400);
  }

  switch (body.op) {
    case "list": {
      const { data, error } = await adminClient.from("empresas").select("*").order("nombre");
      if (error) return json({ error: error.message }, 400);
      return json({ empresas: data });
    }

    case "create": {
      if (!body.nombre) return json({ error: "nombre es obligatorio" }, 400);
      const { data, error } = await adminClient
        .from("empresas")
        .insert({ nombre: body.nombre, nif: body.nif })
        .select()
        .single();
      if (error) return json({ error: error.message }, 400);
      return json({ empresa: data });
    }

    case "update": {
      if (!body.id) return json({ error: "id es obligatorio" }, 400);
      const { data, error } = await adminClient
        .from("empresas")
        .update({ nombre: body.nombre, nif: body.nif, pausada: body.pausada })
        .eq("id", body.id)
        .select()
        .single();
      if (error) return json({ error: error.message }, 400);
      return json({ empresa: data });
    }

    case "delete": {
      if (!body.id) return json({ error: "id es obligatorio" }, 400);

      // profiles.id referencia auth.users(id), no al revés: borrar la fila de
      // empresas en cascada dejaría cuentas de auth.users huérfanas (sin perfil
      // pero aún capaces de autenticarse). Hay que borrar cada usuario vía Admin
      // API primero (eso sí cascada correctamente a profiles/tarifas/turnos/
      // incidencias) y solo entonces la empresa.
      const { data: perfiles, error: perfilesError } = await adminClient
        .from("profiles")
        .select("id")
        .eq("empresa_id", body.id);
      if (perfilesError) return json({ error: perfilesError.message }, 400);

      for (const perfil of perfiles ?? []) {
        await adminClient.auth.admin.deleteUser(perfil.id);
      }

      const { error: deleteError } = await adminClient.from("empresas").delete().eq("id", body.id);
      if (deleteError) return json({ error: deleteError.message }, 400);
      return json({ ok: true });
    }

    default:
      return json({ error: "op desconocida" }, 400);
  }
});
