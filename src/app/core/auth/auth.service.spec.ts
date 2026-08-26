import { TestBed } from '@angular/core/testing';

import { SupabaseService } from '../supabase/supabase.service';
import { createFakeSupabaseClient, fakeQueryResult, fakeSupabaseService, FakeSupabaseClient } from '../../testing/supabase-test-utils';
import { AuthService } from './auth.service';
import { Profile } from './auth.models';

describe('AuthService', () => {
  let service: AuthService;
  let client: FakeSupabaseClient;

  beforeEach(() => {
    client = createFakeSupabaseClient();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: fakeSupabaseService(client) }],
    });
    service = TestBed.inject(AuthService);
  });

  it('empresaPausada es false cuando no hay perfil cargado', () => {
    expect(service.empresaPausada()).toBe(false);
  });

  it('empresaPausada refleja el estado de pausa de la empresa del perfil', () => {
    service.profile.set({ empresa: { nombre: 'Acme', pausada: true } } as Profile);
    expect(service.empresaPausada()).toBe(true);
  });

  describe('login', () => {
    it('carga el perfil tras un inicio de sesión correcto', async () => {
      const perfil = { id: 'u1', nombre_completo: 'Ana Gómez' } as Profile;
      client.auth.signInWithPassword.and.resolveTo({ data: { user: { id: 'u1' } }, error: null });
      client.from.and.returnValue(fakeQueryResult(perfil, null));

      await service.login('ana.gomez', '1234');

      expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'ana.gomez@limpiasoft.app',
        password: 'lsft-1234',
      });
      expect(service.profile()).toEqual(perfil);
    });

    it('lanza el error de Supabase Auth si las credenciales son incorrectas', async () => {
      client.auth.signInWithPassword.and.resolveTo({ data: {}, error: new Error('Credenciales inválidas') });

      await expectAsync(service.login('ana.gomez', '9999')).toBeRejectedWithError('Credenciales inválidas');
    });
  });

  describe('logout', () => {
    it('limpia el perfil tras cerrar sesión', async () => {
      service.profile.set({ id: 'u1' } as Profile);

      await service.logout();

      expect(client.auth.signOut).toHaveBeenCalled();
      expect(service.profile()).toBeNull();
    });
  });

  describe('cambiarPin', () => {
    it('deriva la contraseña interna a partir del PIN', async () => {
      await service.cambiarPin('4321');
      expect(client.auth.updateUser).toHaveBeenCalledWith({ password: 'lsft-4321' });
    });

    it('lanza el error de Supabase Auth si falla el cambio', async () => {
      client.auth.updateUser.and.resolveTo({ error: new Error('no autenticado') });
      await expectAsync(service.cambiarPin('4321')).toBeRejectedWithError('no autenticado');
    });
  });
});
