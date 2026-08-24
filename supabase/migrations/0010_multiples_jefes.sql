-- Permite dar de alta más de un jefe por empresa: la rama del trigger que antes
-- solo aceptaba rol='empleado' para una empresa existente ahora acepta también
-- rol='jefe', usando el rol recibido en vez de darlo por hecho.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol text;
  v_empresa_id uuid;
  v_username text;
  v_nombre_completo text;
begin
  v_rol := new.raw_app_meta_data->>'rol';
  v_username := new.raw_user_meta_data->>'username';

  if v_rol in ('empleado', 'jefe') and new.raw_app_meta_data ? 'empresa_id' and v_username is not null then
    v_empresa_id := (new.raw_app_meta_data->>'empresa_id')::uuid;
    v_nombre_completo := coalesce(new.raw_user_meta_data->>'nombre_completo', new.email);

    insert into public.profiles (id, empresa_id, rol, nombre_completo, email, username)
    values (new.id, v_empresa_id, v_rol, v_nombre_completo, new.email, v_username)
    on conflict (id) do nothing;

  elsif new.raw_user_meta_data->>'tipo' = 'registro_empresa' and v_username is not null and not exists (
    select 1 from public.profiles where id = new.id
  ) then
    insert into public.empresas (nombre)
    values (new.raw_user_meta_data->>'nombre_empresa')
    returning id into v_empresa_id;

    insert into public.profiles (id, empresa_id, rol, nombre_completo, email, username)
    values (new.id, v_empresa_id, 'jefe', new.raw_user_meta_data->>'nombre_completo', new.email, v_username)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
