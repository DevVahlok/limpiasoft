import { Injectable, inject } from '@angular/core';

import { AuthService } from '../../../core/auth/auth.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';

export interface Puesto {
  id: string;
  empresa_id: string;
  nombre: string;
  direccion: string | null;
  notas: string | null;
  activo: boolean;
  created_at: string;
}

export interface PuestoInput {
  nombre: string;
  direccion?: string;
  notas?: string;
}

@Injectable({ providedIn: 'root' })
export class PuestosService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly authService = inject(AuthService);

  async listar(): Promise<Puesto[]> {
    const { data, error } = await this.supabase.from('puestos_trabajo').select('*').order('nombre');
    if (error) {
      throw error;
    }
    return data as Puesto[];
  }

  async crear(input: PuestoInput): Promise<Puesto> {
    const empresaId = this.authService.profile()?.empresa_id;
    if (!empresaId) {
      throw new Error('Sesión no válida');
    }
    const { data, error } = await this.supabase
      .from('puestos_trabajo')
      .insert({ ...input, empresa_id: empresaId })
      .select()
      .single();
    if (error) {
      throw error;
    }
    return data as Puesto;
  }

  async actualizar(id: string, input: PuestoInput): Promise<void> {
    const { error } = await this.supabase.from('puestos_trabajo').update(input).eq('id', id);
    if (error) {
      throw error;
    }
  }

  async cambiarActivo(id: string, activo: boolean): Promise<void> {
    const { error } = await this.supabase.from('puestos_trabajo').update({ activo }).eq('id', id);
    if (error) {
      throw error;
    }
  }
}
