export interface Tarifa {
  id: string;
  empresa_id: string;
  empleado_id: string;
  tarifa_hora: number;
  vigente_desde: string;
  created_at: string;
  empleado: { nombre_completo: string } | null;
}

export interface TarifaInput {
  empleado_id: string;
  tarifa_hora: number;
  vigente_desde: string;
}
