import { Injectable, inject } from '@angular/core';

import { Profile } from '../auth/auth.models';
import { SupabaseService } from '../supabase/supabase.service';
import { mensajeError } from './admin-error.util';

export interface UsuarioFormParams {
  empresaId: string;
  nombreCompleto: string;
  telefono?: string;
  rol: 'empleado' | 'jefe';
  pin?: string;
}

export interface UsuarioUpdateParams {
  nombreCompleto?: string;
  telefono?: string;
  rol?: 'empleado' | 'jefe';
  activo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminUsuariosService {
  private readonly supabase = inject(SupabaseService).client;

  private async invocar<T>(body: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.supabase.functions.invoke<T>('admin-usuarios', { body });
    if (error) {
      throw new Error(await mensajeError(error));
    }
    if (!data) {
      throw new Error('Respuesta vacía');
    }
    return data;
  }

  async listar(empresaId: string): Promise<Profile[]> {
    const { usuarios } = await this.invocar<{ usuarios: Profile[] }>({ op: 'list', empresa_id: empresaId });
    return usuarios;
  }

  async crear(params: UsuarioFormParams): Promise<{ id: string; username: string }> {
    return this.invocar({
      op: 'create',
      empresa_id: params.empresaId,
      nombre_completo: params.nombreCompleto,
      telefono: params.telefono,
      rol: params.rol,
      pin: params.pin,
    });
  }

  async actualizar(id: string, params: UsuarioUpdateParams): Promise<Profile> {
    const { usuario } = await this.invocar<{ usuario: Profile }>({
      op: 'update',
      id,
      nombre_completo: params.nombreCompleto,
      telefono: params.telefono,
      rol: params.rol,
      activo: params.activo,
    });
    return usuario;
  }

  async resetearPin(id: string, pin: string): Promise<void> {
    await this.invocar({ op: 'reset_pin', id, pin });
  }

  async eliminar(id: string): Promise<void> {
    await this.invocar({ op: 'delete', id });
  }
}
