create table public.puestos_trabajo (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nombre text not null,
  direccion text,
  notas text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.tarifas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  empleado_id uuid not null references public.profiles(id) on delete cascade,
  tarifa_hora numeric(10,2) not null check (tarifa_hora >= 0),
  vigente_desde date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.turnos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  empleado_id uuid not null references public.profiles(id) on delete cascade,
  puesto_id uuid not null references public.puestos_trabajo(id) on delete restrict,
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  estado text not null default 'programado' check (estado in ('programado','completado','cancelado')),
  notas text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint turnos_horas_check check (hora_fin > hora_inicio)
);

create table public.incidencias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  turno_id uuid references public.turnos(id) on delete set null,
  empleado_id uuid not null references public.profiles(id) on delete cascade,
  tipo text not null check (tipo in ('ausencia','problema_sitio','otro')),
  descripcion text,
  estado text not null default 'pendiente' check (estado in ('pendiente','revisada','resuelta')),
  created_at timestamptz not null default now()
);

create index puestos_trabajo_empresa_id_idx on public.puestos_trabajo(empresa_id);
create index tarifas_empleado_id_idx on public.tarifas(empleado_id);
create index turnos_empresa_id_idx on public.turnos(empresa_id);
create index turnos_empleado_id_idx on public.turnos(empleado_id);
create index turnos_fecha_idx on public.turnos(fecha);
create index incidencias_empresa_id_idx on public.incidencias(empresa_id);
create index incidencias_empleado_id_idx on public.incidencias(empleado_id);
