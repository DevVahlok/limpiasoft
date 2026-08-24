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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  let body: {
    op?: string;
    id?: string;
    email?: string;
    password?: string;
    nombre_completo?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body JSON inválido" }, 400);
  }

  // Arranque: si todavía no existe ningún desarrollador, se permite crear el
  // primero sin estar autenticado (igual que registrar-empresa es pública
  // porque no puede exigir ser jefe de una empresa que aún no existe). En
  // cuanto exista uno, esta vía se cierra sola; como más abajo no se permite
  // que un desarrollador se borre a sí mismo, la tabla nunca vuelve a quedar
  // vacía, así que esta ventana solo puede darse una vez.
  if (body.op === "create") {
    const { count } = await adminClient.from("app_admins").select("id", { count: "exact", head: true });
    if (count === 0) {
      return crearDesarrollador(adminClient, body);
    }
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Falta cabecera Authorization" }, 401);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) {
    return json({ error: "Token inválido" }, 401);
  }

  const { data: caller } = await adminClient
    .from("app_admins")
    .select("id")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (!caller) {
    return json({ error: "Solo un desarrollador puede gestionar desarrolladores" }, 403);
  }

  switch (body.op) {
    case "list": {
      const { data, error } = await adminClient.from("app_admins").select("*").order("nombre_completo");
      if (error) return json({ error: error.message }, 400);
      return json({ desarrolladores: data });
    }

    case "create":
      return crearDesarrollador(adminClient, body);

    case "update": {
      if (!body.id) return json({ error: "id es obligatorio" }, 400);
      if (!body.nombre_completo) return json({ error: "nombre_completo es obligatorio" }, 400);
      const { data, error } = await adminClient
        .from("app_admins")
        .update({ nombre_completo: body.nombre_completo })
        .eq("id", body.id)
        .select()
        .single();
      if (error) return json({ error: error.message }, 400);
      return json({ desarrollador: data });
    }

    case "reset_password": {
      if (!body.id || !body.password) return json({ error: "id y password son obligatorios" }, 400);
      if (body.password.length < 8) return json({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);
      const { error } = await adminClient.auth.admin.updateUserById(body.id, { password: body.password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    case "delete": {
      if (!body.id) return json({ error: "id es obligatorio" }, 400);
      if (body.id === userData.user.id) {
        return json({ error: "No puedes borrar tu propia cuenta" }, 400);
      }
      const { error } = await adminClient.auth.admin.deleteUser(body.id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    default:
      return json({ error: "op desconocida" }, 400);
  }
});

async function crearDesarrollador(
  // deno-lint-ignore no-explicit-any
  adminClient: any,
  body: { email?: string; password?: string; nombre_completo?: string },
): Promise<Response> {
  const { email, password, nombre_completo } = body;
  if (!email || !password || !nombre_completo) {
    return json({ error: "email, password y nombre_completo son obligatorios" }, 400);
  }
  if (password.length < 8) {
    return json({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre_completo, tipo: "desarrollador" },
  });
  if (createError || !created.user) {
    return json({ error: createError?.message ?? "No se pudo crear la cuenta" }, 400);
  }

  const { error: insertError } = await adminClient
    .from("app_admins")
    .insert({ id: created.user.id, email, nombre_completo });
  if (insertError) {
    return json({ error: insertError.message }, 400);
  }

  return json({ id: created.user.id, email });
}
