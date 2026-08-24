import { Injectable, inject } from '@angular/core';

import { SupabaseService } from '../supabase/supabase.service';
import { mensajeError } from './admin-error.util';
import { Empresa } from './admin.models';

export interface EmpresaFormParams {
  nombre: string;
  nif?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminEmpresasService {
  private readonly supabase = inject(SupabaseService).client;

  private async invocar<T>(body: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.supabase.functions.invoke<T & { error?: string }>('admin-empresas', {
      body,
    });
    if (error) {
      throw new Error(await mensajeError(error));
    }
    if (!data) {
      throw new Error('Respuesta vacía');
    }
    return data;
  }

  async listar(): Promise<Empresa[]> {
    const { empresas } = await this.invocar<{ empresas: Empresa[] }>({ op: 'list' });
    return empresas;
  }

  async crear(params: EmpresaFormParams): Promise<Empresa> {
    const { empresa } = await this.invocar<{ empresa: Empresa }>({ op: 'create', ...params });
    return empresa;
  }

  async actualizar(id: string, params: EmpresaFormParams): Promise<Empresa> {
    const { empresa } = await this.invocar<{ empresa: Empresa }>({ op: 'update', id, ...params });
    return empresa;
  }

  async eliminar(id: string): Promise<void> {
    await this.invocar<{ ok: boolean }>({ op: 'delete', id });
  }
}
