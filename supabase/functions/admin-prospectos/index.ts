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
    return json({ error: "Solo un desarrollador puede gestionar prospectos" }, 403);
  }

  let body: {
    op?: string;
    id?: string;
    nombre?: string;
    ciudad?: string;
    direccion?: string;
    telefono?: string;
    web?: string;
    notas?: string;
    lat?: number;
    lng?: number;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body JSON inválido" }, 400);
  }

  switch (body.op) {
    case "list": {
      let query = adminClient.from("prospectos").select("*").order("nombre");
      if (body.ciudad) {
        query = query.eq("ciudad", body.ciudad);
      }
      const { data, error } = await query;
      if (error) return json({ error: error.message }, 400);
      return json({ prospectos: data });
    }

    case "create": {
      if (!body.nombre || !body.ciudad) {
        return json({ error: "nombre y ciudad son obligatorios" }, 400);
      }
      const { data, error } = await adminClient
        .from("prospectos")
        .insert({
          nombre: body.nombre,
          ciudad: body.ciudad,
          direccion: body.direccion,
          telefono: body.telefono,
          web: body.web,
          notas: body.notas,
          lat: body.lat,
          lng: body.lng,
        })
        .select()
        .single();
      if (error) return json({ error: error.message }, 400);
      return json({ prospecto: data });
    }

    case "update": {
      if (!body.id) return json({ error: "id es obligatorio" }, 400);
      const { data, error } = await adminClient
        .from("prospectos")
        .update({
          nombre: body.nombre,
          ciudad: body.ciudad,
          direccion: body.direccion,
          telefono: body.telefono,
          web: body.web,
          notas: body.notas,
          lat: body.lat,
          lng: body.lng,
        })
        .eq("id", body.id)
        .select()
        .single();
      if (error) return json({ error: error.message }, 400);
      return json({ prospecto: data });
    }

    case "delete": {
      if (!body.id) return json({ error: "id es obligatorio" }, 400);
      const { error } = await adminClient.from("prospectos").delete().eq("id", body.id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    default:
      return json({ error: "op desconocida" }, 400);
  }
});
