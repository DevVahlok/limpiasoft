import { Injectable, inject, signal } from '@angular/core';

import { SupabaseService } from '../supabase/supabase.service';
import { Profile } from './auth.models';

export interface SignUpEmpresaParams {
  nombreEmpresa: string;
  nombreCompleto: string;
  pin: string;
}

const DOMINIO_AUTH = 'limpiasoft.app';

/**
 * Supabase Auth exige un email y una contraseña con longitud mínima; aquí no hay ninguno
 * de los dos "de verdad". El login real es usuario + PIN de 4 dígitos (decisión de producto
 * para el personal de limpieza), así que el email y la contraseña que ve Supabase son solo
 * una codificación interna de eso, nunca expuesta al usuario.
 */
function emailSintetico(username: string): string {
  return `${username}@${DOMINIO_AUTH}`;
}

function passwordDerivada(pin: string): string {
  return `lsft-${pin}`;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService).client;

  readonly profile = signal<Profile | null>(null);
  readonly loading = signal(true);

  async restoreSession(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    if (data.session) {
      await this.loadProfile(data.session.user.id);
    }
    this.loading.set(false);

    this.supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        void this.loadProfile(session.user.id);
      } else {
        this.profile.set(null);
      }
    });
  }

  /** Crea la empresa y su jefe (vía Edge Function con Admin API) y a continuación inicia sesión. Devuelve el username asignado. */
  async signUpEmpresa(params: SignUpEmpresaParams): Promise<string> {
    const { data, error } = await this.supabase.functions.invoke<{ username: string; error?: string }>(
      'registrar-empresa',
      { body: { nombreEmpresa: params.nombreEmpresa, nombreCompleto: params.nombreCompleto, pin: params.pin } }
    );
    if (error || !data?.username) {
      throw new Error(data?.error ?? error?.message ?? 'No se pudo registrar la empresa.');
    }
    await this.login(data.username, params.pin);
    return data.username;
  }

  async login(username: string, pin: string): Promise<void> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: emailSintetico(username),
      password: passwordDerivada(pin),
    });
    if (error) {
      throw error;
    }
    if (data.user) {
      await this.loadProfile(data.user.id);
    }
  }

  async cambiarPin(nuevoPin: string): Promise<void> {
    const { error } = await this.supabase.auth.updateUser({ password: passwordDerivada(nuevoPin) });
    if (error) {
      throw error;
    }
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
    this.profile.set(null);
  }

  private async loadProfile(userId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*, empresa:empresas(nombre, pausada)')
      .eq('id', userId)
      .single();
    if (!error && data) {
      this.profile.set(data as Profile);
    }
  }
}
