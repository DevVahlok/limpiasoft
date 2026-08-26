-- Marca de "pagado" por empleado y mes en el resumen mensual del jefe. La
-- existencia de una fila para (empleado_id, mes) significa "pagado"; borrarla
-- es "desmarcar". No tiene relación con la tabla `pagos` de /admin/ingresos
-- (esa es lo que las empresas pagan a Limpiasoft; esta es lo que la empresa
-- paga a sus propios empleados).
create table public.pagos_nomina (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  empleado_id uuid not null references public.profiles(id) on delete cascade,
  mes date not null,
  created_at timestamptz not null default now(),
  unique (empleado_id, mes)
);

create index pagos_nomina_empresa_id_idx on public.pagos_nomina(empresa_id);
create index pagos_nomina_mes_idx on public.pagos_nomina(mes);

alter table public.pagos_nomina enable row level security;

create policy pagos_nomina_select_jefe on public.pagos_nomina
  for select using (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
  );

create policy pagos_nomina_insert_jefe on public.pagos_nomina
  for insert with check (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
    and not public.empresa_esta_pausada(empresa_id)
  );

create policy pagos_nomina_delete_jefe on public.pagos_nomina
  for delete using (
    public.get_my_rol() = 'jefe' and empresa_id = public.get_my_empresa_id()
    and not public.empresa_esta_pausada(empresa_id)
  );
