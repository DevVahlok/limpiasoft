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
    return json({ error: "Solo un desarrollador puede gestionar pagos" }, 403);
  }

  let body: { op?: string; id?: string; empresa_id?: string; importe?: number; fecha?: string; notas?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body JSON inválido" }, 400);
  }

  switch (body.op) {
    case "list": {
      const { data, error } = await adminClient
        .from("pagos")
        .select("*, empresa:empresas(nombre)")
        .order("fecha", { ascending: false });
      if (error) return json({ error: error.message }, 400);
      return json({ pagos: data });
    }

    case "create": {
      if (!body.empresa_id || typeof body.importe !== "number") {
        return json({ error: "empresa_id e importe son obligatorios" }, 400);
      }
      const { data, error } = await adminClient
        .from("pagos")
        .insert({ empresa_id: body.empresa_id, importe: body.importe, fecha: body.fecha, notas: body.notas })
        .select("*, empresa:empresas(nombre)")
        .single();
      if (error) return json({ error: error.message }, 400);
      return json({ pago: data });
    }

    case "update": {
      if (!body.id) return json({ error: "id es obligatorio" }, 400);
      const { data, error } = await adminClient
        .from("pagos")
        .update({ importe: body.importe, fecha: body.fecha, notas: body.notas })
        .eq("id", body.id)
        .select("*, empresa:empresas(nombre)")
        .single();
      if (error) return json({ error: error.message }, 400);
      return json({ pago: data });
    }

    case "delete": {
      if (!body.id) return json({ error: "id es obligatorio" }, 400);
      const { error } = await adminClient.from("pagos").delete().eq("id", body.id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    default:
      return json({ error: "op desconocida" }, 400);
  }
});
