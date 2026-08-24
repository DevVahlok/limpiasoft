-- El empleado necesita leer el nombre/dirección del puesto de sus propios turnos
-- (calendario, incidencias, resumen). Las mutaciones siguen restringidas al jefe
-- (política puestos_trabajo_all_jefe de la migración 0004).
create policy puestos_trabajo_select_empresa on public.puestos_trabajo
  for select using (empresa_id = public.get_my_empresa_id());
