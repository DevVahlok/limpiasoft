-- Cambio de login por email+contraseña a usuario ("nombre.apellido") + PIN de 4 dígitos.
-- El email/contraseña que ve Supabase Auth pasan a ser una codificación interna
-- (ver AuthService en el frontend), nunca expuesta al usuario.
alter table public.profiles add column username text;

create unique index profiles_username_key on public.profiles (username);

alter table public.profiles alter column username set not null;

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

  if v_rol = 'empleado' and new.raw_app_meta_data ? 'empresa_id' and v_username is not null then
    v_empresa_id := (new.raw_app_meta_data->>'empresa_id')::uuid;
    v_nombre_completo := coalesce(new.raw_user_meta_data->>'nombre_completo', new.email);

    insert into public.profiles (id, empresa_id, rol, nombre_completo, email, username)
    values (new.id, v_empresa_id, 'empleado', v_nombre_completo, new.email, v_username)
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
