import { Injectable, inject } from '@angular/core';

import { AuthService } from '../auth/auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { Tarifa, TarifaInput } from './tarifa.models';

@Injectable({ providedIn: 'root' })
export class TarifasService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly authService = inject(AuthService);

  /** RLS ya limita el resultado: el jefe ve las de su empresa, el empleado solo las suyas. Más recientes primero. */
  async listar(): Promise<Tarifa[]> {
    const { data, error } = await this.supabase
      .from('tarifas')
      .select('*, empleado:profiles!tarifas_empleado_id_fkey(nombre_completo)')
      .order('vigente_desde', { ascending: false });
    if (error) {
      throw error;
    }
    return data as unknown as Tarifa[];
  }

  async crear(input: TarifaInput): Promise<void> {
    const empresaId = this.authService.profile()?.empresa_id;
    if (!empresaId) {
      throw new Error('Sesión no válida');
    }
    const { error } = await this.supabase.from('tarifas').insert({ ...input, empresa_id: empresaId });
    if (error) {
      throw error;
    }
  }
}
