import { TestBed } from '@angular/core/testing';

import { SupabaseService } from '../supabase/supabase.service';
import { createFakeSupabaseClient, fakeQueryResult, fakeSupabaseService, FakeSupabaseClient } from '../../testing/supabase-test-utils';
import { AdminAuthService, SIN_ACCESO_MENSAJE } from './admin-auth.service';
import { AppAdmin } from './admin.models';

function esperarMicrotareas(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let client: FakeSupabaseClient;

  beforeEach(() => {
    client = createFakeSupabaseClient();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: fakeSupabaseService(client) }],
    });
    service = TestBed.inject(AdminAuthService);
  });

  it('el estado inicial no tiene admin cargado y loading es true', () => {
    expect(service.admin()).toBeNull();
    expect(service.loading()).toBe(true);
  });

  describe('restoreSession', () => {
    it('carga el admin si hay una sesión activa y baja loading a false', async () => {
      const admin = { id: 'u1', email: 'dev@limpiasoft.app' } as AppAdmin;
      client.auth.getSession.and.resolveTo({ data: { session: { user: { id: 'u1' } } } });
      client.from.and.returnValue(fakeQueryResult(admin, null));

      await service.restoreSession();

      expect(service.admin()).toEqual(admin);
      expect(service.loading()).toBe(false);
    });

    it('no carga ningún admin si no hay sesión y baja loading a false', async () => {
      client.auth.getSession.and.resolveTo({ data: { session: null } });

      await service.restoreSession();

      expect(service.admin()).toBeNull();
      expect(service.loading()).toBe(false);
    });

    it('se suscribe a onAuthStateChange y actualiza el admin cuando llega una nueva sesión', async () => {
      client.auth.getSession.and.resolveTo({ data: { session: null } });
      await service.restoreSession();

      const admin = { id: 'u2', email: 'otro@limpiasoft.app' } as AppAdmin;
      client.from.and.returnValue(fakeQueryResult(admin, null));
      const callback = client.auth.onAuthStateChange.calls.mostRecent().args[0];
      callback('SIGNED_IN', { user: { id: 'u2' } } as never);
      await esperarMicrotareas();

      expect(service.admin()).toEqual(admin);
    });

    it('limpia el admin cuando onAuthStateChange recibe una sesión nula', async () => {
      client.auth.getSession.and.resolveTo({ data: { session: null } });
      await service.restoreSession();
      service.admin.set({ id: 'u1' } as AppAdmin);

      const callback = client.auth.onAuthStateChange.calls.mostRecent().args[0];
      callback('SIGNED_OUT', null as never);

      expect(service.admin()).toBeNull();
    });
  });

  describe('login', () => {
    it('inicia sesión y carga el admin correspondiente', async () => {
      const admin = { id: 'u1', email: 'dev@limpiasoft.app' } as AppAdmin;
      client.auth.signInWithPassword.and.resolveTo({ data: { user: { id: 'u1' } }, error: null });
      client.from.and.returnValue(fakeQueryResult(admin, null));

      await service.login('dev@limpiasoft.app', 'secreta');

      expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'dev@limpiasoft.app',
        password: 'secreta',
      });
      expect(service.admin()).toEqual(admin);
    });

    it('lanza el error de Supabase Auth si las credenciales son incorrectas', async () => {
      client.auth.signInWithPassword.and.resolveTo({ data: {}, error: new Error('Credenciales inválidas') });

      await expectAsync(service.login('dev@limpiasoft.app', 'mala')).toBeRejectedWithError('Credenciales inválidas');
    });

    it('cierra la sesión y lanza SIN_ACCESO_MENSAJE si el usuario no es un app_admin', async () => {
      client.auth.signInWithPassword.and.resolveTo({ data: { user: { id: 'u9' } }, error: null });
      client.from.and.returnValue(fakeQueryResult(null, null));

      await expectAsync(service.login('empleado@limpiasoft.app', 'secreta')).toBeRejectedWithError(SIN_ACCESO_MENSAJE);

      expect(client.auth.signOut).toHaveBeenCalled();
      expect(service.admin()).toBeNull();
    });
  });

  describe('logout', () => {
    it('cierra sesión y limpia el admin', async () => {
      service.admin.set({ id: 'u1' } as AppAdmin);

      await service.logout();

      expect(client.auth.signOut).toHaveBeenCalled();
      expect(service.admin()).toBeNull();
    });
  });
});
