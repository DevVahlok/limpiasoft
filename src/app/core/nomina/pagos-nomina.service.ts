import { Injectable, inject } from '@angular/core';

import { SupabaseService } from '../supabase/supabase.service';

export interface PagoNomina {
  id: string;
  empresa_id: string;
  empleado_id: string;
  mes: string;
}

@Injectable({ providedIn: 'root' })
export class PagosNominaService {
  private readonly supabase = inject(SupabaseService).client;

  /** @param mes formato 'YYYY-MM' */
  async listarPorMes(mes: string): Promise<PagoNomina[]> {
    const { data, error } = await this.supabase.from('pagos_nomina').select('*').eq('mes', `${mes}-01`);
    if (error) {
      throw error;
    }
    return data as PagoNomina[];
  }

  async marcarPagado(empresaId: string, empleadoId: string, mes: string): Promise<PagoNomina> {
    const { data, error } = await this.supabase
      .from('pagos_nomina')
      .insert({ empresa_id: empresaId, empleado_id: empleadoId, mes: `${mes}-01` })
      .select()
      .single();
    if (error) {
      throw error;
    }
    return data as PagoNomina;
  }

  async desmarcarPagado(id: string): Promise<void> {
    const { error } = await this.supabase.from('pagos_nomina').delete().eq('id', id);
    if (error) {
      throw error;
    }
  }
}
