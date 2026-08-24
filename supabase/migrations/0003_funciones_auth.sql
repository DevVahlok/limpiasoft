create function public.get_my_empresa_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select empresa_id from public.profiles where id = auth.uid()
$$;

create function public.get_my_rol()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select rol from public.profiles where id = auth.uid()
$$;

-- Nota: esta versión inicial se sustituye en 0006 y 0007 (username + trigger en INSERT OR UPDATE).
create function public.handle_new_user()
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

  if v_rol = 'empleado' then
    v_empresa_id := (new.raw_app_meta_data->>'empresa_id')::uuid;
    v_nombre_completo := coalesce(new.raw_user_meta_data->>'nombre_completo', new.email);

    insert into public.profiles (id, empresa_id, rol, nombre_completo, email)
    values (new.id, v_empresa_id, 'empleado', v_nombre_completo, new.email);

  elsif new.raw_user_meta_data->>'tipo' = 'registro_empresa' then
    insert into public.empresas (nombre)
    values (new.raw_user_meta_data->>'nombre_empresa')
    returning id into v_empresa_id;

    insert into public.profiles (id, empresa_id, rol, nombre_completo, email)
    values (new.id, v_empresa_id, 'jefe', new.raw_user_meta_data->>'nombre_completo', new.email);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
