export type EstadoTurno = 'programado' | 'completado' | 'cancelado';

export interface Turno {
  id: string;
  empresa_id: string;
  empleado_id: string;
  puesto_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: EstadoTurno;
  notas: string | null;
  empleado: { nombre_completo: string } | null;
  puesto: { nombre: string } | null;
}

export interface TurnoInput {
  empleado_id: string;
  puesto_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  notas?: string;
}
