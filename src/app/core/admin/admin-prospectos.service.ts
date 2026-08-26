import { Injectable, inject } from '@angular/core';

import { SupabaseService } from '../supabase/supabase.service';
import { mensajeError } from './admin-error.util';
import { Prospecto } from './admin.models';

export interface ProspectoFormParams {
  nombre: string;
  ciudad: string;
  direccion?: string;
  telefono?: string;
  web?: string;
  notas?: string;
  lat?: number;
  lng?: number;
}

@Injectable({ providedIn: 'root' })
export class AdminProspectosService {
  private readonly supabase = inject(SupabaseService).client;

  private async invocar<T>(body: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.supabase.functions.invoke<T>('admin-prospectos', { body });
    if (error) {
      throw new Error(await mensajeError(error));
    }
    if (!data) {
      throw new Error('Respuesta vacía');
    }
    return data;
  }

  async listarPorCiudad(ciudad: string): Promise<Prospecto[]> {
    const { prospectos } = await this.invocar<{ prospectos: Prospecto[] }>({ op: 'list', ciudad });
    return prospectos;
  }

  async crear(params: ProspectoFormParams): Promise<Prospecto> {
    const { prospecto } = await this.invocar<{ prospecto: Prospecto }>({ op: 'create', ...params });
    return prospecto;
  }

  async actualizar(id: string, params: ProspectoFormParams): Promise<Prospecto> {
    const { prospecto } = await this.invocar<{ prospecto: Prospecto }>({ op: 'update', id, ...params });
    return prospecto;
  }

  async eliminar(id: string): Promise<void> {
    await this.invocar<{ ok: boolean }>({ op: 'delete', id });
  }
}
