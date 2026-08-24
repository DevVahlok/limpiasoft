import { Injectable, inject } from '@angular/core';

import { Profile } from '../../../core/auth/auth.models';
import { SupabaseService } from '../../../core/supabase/supabase.service';

export interface CrearEmpleadoParams {
  nombreCompleto: string;
  telefono?: string;
  tarifaHora?: number;
  pin?: string;
}

export interface CrearEmpleadoResultado {
  id: string;
  username: string;
}

@Injectable({ providedIn: 'root' })
export class EmpleadosService {
  private readonly supabase = inject(SupabaseService).client;

  async listar(): Promise<Profile[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('rol', 'empleado')
      .order('nombre_completo');
    if (error) {
      throw error;
    }
    return data as Profile[];
  }

  async crear(params: CrearEmpleadoParams): Promise<CrearEmpleadoResultado> {
    const { data, error } = await this.supabase.functions.invoke<CrearEmpleadoResultado>('crear-empleado', {
      body: {
        nombre_completo: params.nombreCompleto,
        telefono: params.telefono,
        tarifa_hora: params.tarifaHora,
        pin: params.pin,
      },
    });

    if (error) {
      throw error;
    }
    if (!data) {
      throw new Error('Respuesta vacía al crear el empleado');
    }
    return data;
  }
}
