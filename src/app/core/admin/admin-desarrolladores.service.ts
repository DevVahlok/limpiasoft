import { Injectable, inject } from '@angular/core';

import { SupabaseService } from '../supabase/supabase.service';
import { mensajeError } from './admin-error.util';
import { AppAdmin } from './admin.models';

export interface DesarrolladorFormParams {
  email: string;
  password: string;
  nombreCompleto: string;
}

@Injectable({ providedIn: 'root' })
export class AdminDesarrolladoresService {
  private readonly supabase = inject(SupabaseService).client;

  private async invocar<T>(body: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.supabase.functions.invoke<T>('admin-desarrolladores', { body });
    if (error) {
      throw new Error(await mensajeError(error));
    }
    if (!data) {
      throw new Error('Respuesta vacía');
    }
    return data;
  }

  async listar(): Promise<AppAdmin[]> {
    const { desarrolladores } = await this.invocar<{ desarrolladores: AppAdmin[] }>({ op: 'list' });
    return desarrolladores;
  }

  async crear(params: DesarrolladorFormParams): Promise<{ id: string; email: string }> {
    return this.invocar({
      op: 'create',
      email: params.email,
      password: params.password,
      nombre_completo: params.nombreCompleto,
    });
  }

  async actualizar(id: string, nombreCompleto: string): Promise<AppAdmin> {
    const { desarrollador } = await this.invocar<{ desarrollador: AppAdmin }>({
      op: 'update',
      id,
      nombre_completo: nombreCompleto,
    });
    return desarrollador;
  }

  async resetearPassword(id: string, password: string): Promise<void> {
    await this.invocar({ op: 'reset_password', id, password });
  }

  async eliminar(id: string): Promise<void> {
    await this.invocar({ op: 'delete', id });
  }
}
