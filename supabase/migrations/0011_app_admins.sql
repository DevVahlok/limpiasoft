-- Cuentas de desarrollador: totalmente aparte de profiles/empresas, con login
-- por email+contraseña real (no el usuario+PIN de jefes/empleados). Todas las
-- operaciones de gestión (listar/crear/editar/borrar) se hacen desde Edge
-- Functions con service_role, igual que registrar-empresa/crear-empleado, así
-- que aquí solo hace falta que cada desarrollador pueda leer su propia fila.
create table public.app_admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  nombre_completo text not null,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

create policy app_admins_select_own on public.app_admins
  for select using (id = auth.uid());
