import { Injectable, inject } from '@angular/core';

import { SupabaseService } from '../supabase/supabase.service';
import { EstadoTurno, Turno, TurnoInput } from './turno.models';

const SELECT_CON_DETALLE =
  '*, empleado:profiles!turnos_empleado_id_fkey(nombre_completo), puesto:puestos_trabajo!turnos_puesto_id_fkey(nombre)';

@Injectable({ providedIn: 'root' })
export class TurnosService {
  private readonly supabase = inject(SupabaseService).client;

  /** RLS ya limita el resultado: el jefe ve los de su empresa, el empleado solo los suyos. */
  async listarPorRango(desde: string, hasta: string): Promise<Turno[]> {
    const { data, error } = await this.supabase
      .from('turnos')
      .select(SELECT_CON_DETALLE)
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha')
      .order('hora_inicio');
    if (error) {
      throw error;
    }
    return data as unknown as Turno[];
  }

  async crear(input: TurnoInput, empresaId: string): Promise<void> {
    const { error } = await this.supabase.from('turnos').insert({ ...input, empresa_id: empresaId });
    if (error) {
      throw error;
    }
  }

  async actualizar(id: string, input: TurnoInput & { estado?: EstadoTurno }): Promise<void> {
    const { error } = await this.supabase.from('turnos').update(input).eq('id', id);
    if (error) {
      throw error;
    }
  }

  async eliminar(id: string): Promise<void> {
    const { error } = await this.supabase.from('turnos').delete().eq('id', id);
    if (error) {
      throw error;
    }
  }
}
