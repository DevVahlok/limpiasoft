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
  precio_mensual: number;
  created_at: string;
}

export interface Pago {
  id: string;
  empresa_id: string;
  importe: number;
  fecha: string;
  notas: string | null;
  created_at: string;
  empresa: { nombre: string } | null;
}

export interface Prospecto {
  id: string;
  nombre: string;
  ciudad: string;
  direccion: string | null;
  telefono: string | null;
  web: string | null;
  notas: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
}
