-- Precio mensual por empresa (60€ IVA incluido por defecto, editable por
-- empresa) y tabla de pagos reales, introducidos a mano por el desarrollador
-- desde /admin/ingresos.

alter table public.empresas
  add column precio_mensual numeric(10,2) not null default 60.00 check (precio_mensual >= 0);

create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  importe numeric(10,2) not null check (importe >= 0),
  fecha date not null default current_date,
  notas text,
  created_at timestamptz not null default now()
);

create index pagos_empresa_id_idx on public.pagos(empresa_id);
create index pagos_fecha_idx on public.pagos(fecha);

-- Sin políticas: igual que el resto de datos de /admin, nadie autenticado
-- como jefe/empleado debe poder leer esto directamente. Solo se accede vía
-- Edge Function con service_role (como admin-empresas/admin-usuarios).
alter table public.pagos enable row level security;
