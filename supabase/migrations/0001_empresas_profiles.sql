create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  nif text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  rol text not null check (rol in ('jefe','empleado')),
  nombre_completo text not null,
  email text not null,
  telefono text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create index profiles_empresa_id_idx on public.profiles(empresa_id);
