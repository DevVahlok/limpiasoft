export interface AppAdmin {
  id: string;
  email: string;
  nombre_completo: string;
  created_at: string;
}

export interface Empresa {
  id: string;
  nombre: string;
  nif: string | null;
  pausada: boolean;
  created_at: string;
}
