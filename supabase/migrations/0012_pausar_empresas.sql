-- Permite a un desarrollador pausar una empresa (p. ej. por impago): mientras
-- está pausada, ni el jefe ni sus empleados pueden crear ni modificar nada,
-- solo consultar lo que ya existe. Las políticas de SELECT no se tocan.

alter table public.empresas add column pausada boolean not null default false;

create or replace function public.empresa_esta_pausada(p_empresa_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select pausada from public.empresas where id = p_empresa_id), false);
$$;

-- puestos_trabajo: la política "for all" se parte en una por operación para
-- poder dejar el SELECT sin la condición de pausa.
drop policy puestos_trabajo_all_jefe on public.puestos_trabajo;

create policy puestos_trabajo_select_jefe on public.puestos_trabajo
  for select using (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
  );

create policy puestos_trabajo_insert_jefe on public.puestos_trabajo
  for insert with check (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
    and not public.empresa_esta_pausada(empresa_id)
  );

create policy puestos_trabajo_update_jefe on public.puestos_trabajo
  for update using (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
  ) with check (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
    and not public.empresa_esta_pausada(empresa_id)
  );

create policy puestos_trabajo_delete_jefe on public.puestos_trabajo
  for delete using (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
    and not public.empresa_esta_pausada(empresa_id)
  );

-- tarifas: mismo tratamiento.
drop policy tarifas_all_jefe on public.tarifas;

create policy tarifas_select_jefe on public.tarifas
  for select using (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
  );

create policy tarifas_insert_jefe on public.tarifas
  for insert with check (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
    and not public.empresa_esta_pausada(empresa_id)
  );

create policy tarifas_update_jefe on public.tarifas
  for update using (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
  ) with check (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
    and not public.empresa_esta_pausada(empresa_id)
  );

create policy tarifas_delete_jefe on public.tarifas
  for delete using (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
    and not public.empresa_esta_pausada(empresa_id)
  );

-- turnos: mismo tratamiento.
drop policy turnos_all_jefe on public.turnos;

create policy turnos_select_jefe on public.turnos
  for select using (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
  );

create policy turnos_insert_jefe on public.turnos
  for insert with check (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
    and not public.empresa_esta_pausada(empresa_id)
  );

create policy turnos_update_jefe on public.turnos
  for update using (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
  ) with check (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
    and not public.empresa_esta_pausada(empresa_id)
  );

create policy turnos_delete_jefe on public.turnos
  for delete using (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
    and not public.empresa_esta_pausada(empresa_id)
  );

-- incidencias: ya eran políticas separadas, solo hay que añadir el with check.
drop policy incidencias_update_jefe on public.incidencias;

create policy incidencias_update_jefe on public.incidencias
  for update using (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
  ) with check (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
    and not public.empresa_esta_pausada(empresa_id)
  );

drop policy incidencias_insert_empleado on public.incidencias;

create policy incidencias_insert_empleado on public.incidencias
  for insert with check (
    empleado_id = auth.uid() and not public.empresa_esta_pausada(empresa_id)
  );

-- profiles: sin uso actual desde el frontend, pero se deja consistente.
drop policy profiles_update_jefe on public.profiles;

create policy profiles_update_jefe on public.profiles
  for update using (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
  ) with check (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
    and not public.empresa_esta_pausada(empresa_id)
  );
