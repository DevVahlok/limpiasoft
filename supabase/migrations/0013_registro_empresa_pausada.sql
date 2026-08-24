-- Las empresas que se registran ellas mismas desde /registro empiezan
-- pausadas: el desarrollador debe activarlas manualmente (p. ej. tras
-- confirmar el pago) antes de que el jefe y sus empleados puedan usarla
-- más allá de consultar.
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
    insert into public.empresas (nombre, pausada)
    values (new.raw_user_meta_data->>'nombre_empresa', true)
    returning id into v_empresa_id;

    insert into public.profiles (id, empresa_id, rol, nombre_completo, email, username)
    values (new.id, v_empresa_id, 'jefe', new.raw_user_meta_data->>'nombre_completo', new.email, v_username)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
