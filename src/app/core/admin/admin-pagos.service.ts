import { Injectable, inject } from '@angular/core';

import { SupabaseService } from '../supabase/supabase.service';
import { mensajeError } from './admin-error.util';
import { Pago } from './admin.models';

export interface PagoFormParams {
  empresaId: string;
  importe: number;
  fecha: string;
  notas?: string;
}

export interface PagoUpdateParams {
  importe: number;
  fecha: string;
  notas?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminPagosService {
  private readonly supabase = inject(SupabaseService).client;

  private async invocar<T>(body: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.supabase.functions.invoke<T>('admin-pagos', { body });
    if (error) {
      throw new Error(await mensajeError(error));
    }
    if (!data) {
      throw new Error('Respuesta vacía');
    }
    return data;
  }

  async listar(): Promise<Pago[]> {
    const { pagos } = await this.invocar<{ pagos: Pago[] }>({ op: 'list' });
    return pagos;
  }

  async crear(params: PagoFormParams): Promise<Pago> {
    const { pago } = await this.invocar<{ pago: Pago }>({
      op: 'create',
      empresa_id: params.empresaId,
      importe: params.importe,
      fecha: params.fecha,
      notas: params.notas,
    });
    return pago;
  }

  async actualizar(id: string, params: PagoUpdateParams): Promise<Pago> {
    const { pago } = await this.invocar<{ pago: Pago }>({
      op: 'update',
      id,
      importe: params.importe,
      fecha: params.fecha,
      notas: params.notas,
    });
    return pago;
  }

  async eliminar(id: string): Promise<void> {
    await this.invocar<{ ok: boolean }>({ op: 'delete', id });
  }
}
