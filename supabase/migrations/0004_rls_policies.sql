alter table public.empresas enable row level security;
alter table public.profiles enable row level security;
alter table public.puestos_trabajo enable row level security;
alter table public.tarifas enable row level security;
alter table public.turnos enable row level security;
alter table public.incidencias enable row level security;

-- empresas
create policy empresas_select on public.empresas
  for select using (id = public.get_my_empresa_id());

create policy empresas_update_jefe on public.empresas
  for update using (id = public.get_my_empresa_id() and public.get_my_rol() = 'jefe');

-- profiles
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or (public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id())
  );

create policy profiles_update_jefe on public.profiles
  for update using (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
  );

-- puestos_trabajo (solo jefe; la 0008 añade select para toda la empresa)
create policy puestos_trabajo_all_jefe on public.puestos_trabajo
  for all using (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
  ) with check (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
  );

-- tarifas (solo jefe; la 0009 añade select de la propia tarifa al empleado)
create policy tarifas_all_jefe on public.tarifas
  for all using (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
  ) with check (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
  );

-- turnos: jefe acceso completo a su empresa, empleado solo lectura de lo suyo
create policy turnos_all_jefe on public.turnos
  for all using (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
  ) with check (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
  );

create policy turnos_select_empleado on public.turnos
  for select using (empleado_id = auth.uid());

-- incidencias: jefe select/update de su empresa, empleado select/insert de las suyas
create policy incidencias_select_jefe on public.incidencias
  for select using (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
  );

create policy incidencias_update_jefe on public.incidencias
  for update using (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
  );

create policy incidencias_select_empleado on public.incidencias
  for select using (empleado_id = auth.uid());

create policy incidencias_insert_empleado on public.incidencias
  for insert with check (empleado_id = auth.uid());
