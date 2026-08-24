export type Rol = 'jefe' | 'empleado';

export interface Profile {
  id: string;
  empresa_id: string;
  rol: Rol;
  nombre_completo: string;
  username: string;
  email: string;
  telefono: string | null;
  activo: boolean;
  created_at: string;
}
