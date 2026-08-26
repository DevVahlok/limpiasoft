-- Prospección de clientes para el desarrollador (pestaña "Investigación" en
-- /admin): empresas de limpieza candidatas a contactar, con ubicación en
-- mapa. Sin relación con ninguna empresa cliente ni con RLS de jefe/empleado.
create table public.prospectos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  ciudad text not null,
  direccion text,
  telefono text,
  web text,
  notas text,
  lat numeric,
  lng numeric,
  created_at timestamptz not null default now()
);

create index prospectos_ciudad_idx on public.prospectos(ciudad);

-- Igual que `pagos`: sin políticas, solo accesible con service_role desde
-- la Edge Function.
alter table public.prospectos enable row level security;
