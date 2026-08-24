export type TipoIncidencia = 'ausencia' | 'problema_sitio' | 'otro';
export type EstadoIncidencia = 'pendiente' | 'revisada' | 'resuelta';

export interface Incidencia {
  id: string;
  empresa_id: string;
  turno_id: string | null;
  empleado_id: string;
  tipo: TipoIncidencia;
  descripcion: string | null;
  estado: EstadoIncidencia;
  created_at: string;
  empleado: { nombre_completo: string } | null;
  turno: { fecha: string; puesto: { nombre: string } | null } | null;
}

export interface IncidenciaInput {
  turno_id?: string;
  tipo: TipoIncidencia;
  descripcion?: string;
}
