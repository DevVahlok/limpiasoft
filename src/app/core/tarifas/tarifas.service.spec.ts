import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { AuthService } from '../auth/auth.service';
import { Profile } from '../auth/auth.models';
import { SupabaseService } from '../supabase/supabase.service';
import { createFakeSupabaseClient, fakeQueryResult, fakeSupabaseService, FakeSupabaseClient } from '../../testing/supabase-test-utils';
import { Tarifa, TarifaInput } from './tarifa.models';
import { TarifasService } from './tarifas.service';

describe('TarifasService', () => {
  let service: TarifasService;
  let client: FakeSupabaseClient;
  let profileSignal: ReturnType<typeof signal<Profile | null>>;

  beforeEach(() => {
    client = createFakeSupabaseClient();
    profileSignal = signal<Profile | null>(null);
    TestBed.configureTestingModule({
      providers: [
        { provide: SupabaseService, useValue: fakeSupabaseService(client) },
        { provide: AuthService, useValue: { profile: profileSignal } },
      ],
    });
    service = TestBed.inject(TarifasService);
  });

  describe('listar', () => {
    it('devuelve las tarifas que llegan de Supabase', async () => {
      const tarifas = [{ id: 't1' } as Tarifa];
      client.from.and.returnValue(fakeQueryResult(tarifas, null));

      const resultado = await service.listar();

      expect(client.from).toHaveBeenCalledWith('tarifas');
      expect(resultado).toEqual(tarifas);
    });

    it('lanza el error de Supabase si la consulta falla', async () => {
      client.from.and.returnValue(fakeQueryResult(null, new Error('fallo de red')));

      await expectAsync(service.listar()).toBeRejectedWithError('fallo de red');
    });
  });

  describe('crear', () => {
    const input: TarifaInput = { empleado_id: 'e1', tarifa_hora: 12, vigente_desde: '2026-08-01' };

    it('lanza "Sesión no válida" si no hay perfil cargado', async () => {
      profileSignal.set(null);

      await expectAsync(service.crear(input)).toBeRejectedWithError('Sesión no válida');
    });

    it('lanza "Sesión no válida" si el perfil no tiene empresa_id', async () => {
      profileSignal.set({ id: 'u1' } as Profile);

      await expectAsync(service.crear(input)).toBeRejectedWithError('Sesión no válida');
    });

    it('inserta la tarifa con el empresa_id del perfil', async () => {
      profileSignal.set({ id: 'u1', empresa_id: 'empresa-1' } as Profile);
      client.from.and.returnValue(fakeQueryResult(null, null));

      await service.crear(input);

      expect(client.from).toHaveBeenCalledWith('tarifas');
    });

    it('lanza el error de Supabase si la inserción falla', async () => {
      profileSignal.set({ id: 'u1', empresa_id: 'empresa-1' } as Profile);
      client.from.and.returnValue(fakeQueryResult(null, new Error('no autorizado')));

      await expectAsync(service.crear(input)).toBeRejectedWithError('no autorizado');
    });
  });
});
