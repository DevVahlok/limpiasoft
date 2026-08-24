import { Injectable, inject, signal } from '@angular/core';

import { AuthService } from '../auth/auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { EstadoIncidencia, Incidencia, IncidenciaInput } from './incidencia.models';

const SELECT_CON_DETALLE =
  '*, empleado:profiles!incidencias_empleado_id_fkey(nombre_completo), turno:turnos!incidencias_turno_id_fkey(fecha, puesto:puestos_trabajo!turnos_puesto_id_fkey(nombre))';

@Injectable({ providedIn: 'root' })
export class IncidenciasService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly authService = inject(AuthService);

  /** Nº de incidencias pendientes de la empresa (para el badge del jefe). RLS ya limita el conteo. */
  readonly pendientesCount = signal(0);

  async refrescarPendientes(): Promise<void> {
    const { count, error } = await this.supabase
      .from('incidencias')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'pendiente');
    if (!error) {
      this.pendientesCount.set(count ?? 0);
    }
  }

  /** RLS ya limita el resultado: el jefe ve las de su empresa, el empleado solo las suyas. */
  async listar(): Promise<Incidencia[]> {
    const { data, error } = await this.supabase
      .from('incidencias')
      .select(SELECT_CON_DETALLE)
      .order('created_at', { ascending: false });
    if (error) {
      throw error;
    }
    return data as unknown as Incidencia[];
  }

  async crear(input: IncidenciaInput): Promise<void> {
    const profile = this.authService.profile();
    if (!profile) {
      throw new Error('Sesión no válida');
    }
    const { error } = await this.supabase.from('incidencias').insert({
      ...input,
      empleado_id: profile.id,
      empresa_id: profile.empresa_id,
    });
    if (error) {
      throw error;
    }
    void this.refrescarPendientes();
  }

  async actualizarEstado(id: string, estado: EstadoIncidencia): Promise<void> {
    const { error } = await this.supabase.from('incidencias').update({ estado }).eq('id', id);
    if (error) {
      throw error;
    }
    void this.refrescarPendientes();
  }
}
