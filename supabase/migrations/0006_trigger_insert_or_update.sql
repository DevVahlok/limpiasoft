-- Los usuarios creados vía Admin API (auth.admin.createUser) insertan primero la fila en
-- auth.users y solo unos segundos después actualizan raw_app_meta_data/raw_user_meta_data.
-- El trigger original (solo AFTER INSERT) llegaba antes de que esos metadatos existieran.
-- Se pasa a AFTER INSERT OR UPDATE y se hace idempotente con "on conflict do nothing".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol text;
  v_empresa_id uuid;
  v_nombre_completo text;
begin
  v_rol := new.raw_app_meta_data->>'rol';

  if v_rol = 'empleado' and new.raw_app_meta_data ? 'empresa_id' then
    v_empresa_id := (new.raw_app_meta_data->>'empresa_id')::uuid;
    v_nombre_completo := coalesce(new.raw_user_meta_data->>'nombre_completo', new.email);

    insert into public.profiles (id, empresa_id, rol, nombre_completo, email)
    values (new.id, v_empresa_id, 'empleado', v_nombre_completo, new.email)
    on conflict (id) do nothing;

  elsif new.raw_user_meta_data->>'tipo' = 'registro_empresa' and not exists (
    select 1 from public.profiles where id = new.id
  ) then
    insert into public.empresas (nombre)
    values (new.raw_user_meta_data->>'nombre_empresa')
    returning id into v_empresa_id;

    insert into public.profiles (id, empresa_id, rol, nombre_completo, email)
    values (new.id, v_empresa_id, 'jefe', new.raw_user_meta_data->>'nombre_completo', new.email)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert or update of raw_app_meta_data, raw_user_meta_data on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
