import { Injectable, inject, signal } from '@angular/core';

import { SupabaseService } from '../supabase/supabase.service';
import { AppAdmin } from './admin.models';

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly supabase = inject(SupabaseService).client;

  readonly admin = signal<AppAdmin | null>(null);
  readonly loading = signal(true);

  async restoreSession(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    if (data.session) {
      await this.loadAdmin(data.session.user.id);
    }
    this.loading.set(false);

    this.supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        void this.loadAdmin(session.user.id);
      } else {
        this.admin.set(null);
      }
    });
  }

  async login(email: string, password: string): Promise<void> {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
    if (data.user) {
      await this.loadAdmin(data.user.id);
      if (!this.admin()) {
        await this.supabase.auth.signOut();
        throw new Error('Esta cuenta no tiene acceso de desarrollador.');
      }
    }
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
    this.admin.set(null);
  }

  private async loadAdmin(userId: string): Promise<void> {
    const { data, error } = await this.supabase.from('app_admins').select('*').eq('id', userId).maybeSingle();
    if (!error && data) {
      this.admin.set(data as AppAdmin);
    } else {
      this.admin.set(null);
    }
  }
}
