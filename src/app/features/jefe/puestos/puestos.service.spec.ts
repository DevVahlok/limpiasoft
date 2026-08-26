import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { AuthService } from '../../../core/auth/auth.service';
import { Profile } from '../../../core/auth/auth.models';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import {
  createFakeSupabaseClient,
  fakeQueryResult,
  fakeSupabaseService,
  FakeSupabaseClient,
} from '../../../testing/supabase-test-utils';
import { Puesto, PuestoInput, PuestosService } from './puestos.service';

describe('PuestosService', () => {
  let service: PuestosService;
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
    service = TestBed.inject(PuestosService);
  });

  describe('listar', () => {
    it('devuelve los puestos que llegan de Supabase', async () => {
      const puestos = [{ id: 'p1' } as Puesto];
      client.from.and.returnValue(fakeQueryResult(puestos, null));

      const resultado = await service.listar();

      expect(client.from).toHaveBeenCalledWith('puestos_trabajo');
      expect(resultado).toEqual(puestos);
    });

    it('lanza el error de Supabase si la consulta falla', async () => {
      client.from.and.returnValue(fakeQueryResult(null, new Error('fallo de red')));

      await expectAsync(service.listar()).toBeRejectedWithError('fallo de red');
    });
  });

  describe('crear', () => {
    const input: PuestoInput = { nombre: 'Oficina Centro', direccion: 'Calle Falsa 123' };

    it('lanza "Sesión no válida" si no hay perfil cargado', async () => {
      profileSignal.set(null);

      await expectAsync(service.crear(input)).toBeRejectedWithError('Sesión no válida');
    });

    it('inserta el puesto con el empresa_id del perfil y devuelve el creado', async () => {
      profileSignal.set({ id: 'u1', empresa_id: 'empresa-1' } as Profile);
      const puesto = { id: 'p1', nombre: 'Oficina Centro' } as Puesto;
      client.from.and.returnValue(fakeQueryResult(puesto, null));

      const resultado = await service.crear(input);

      expect(client.from).toHaveBeenCalledWith('puestos_trabajo');
      expect(resultado).toEqual(puesto);
    });

    it('lanza el error de Supabase si la inserción falla', async () => {
      profileSignal.set({ id: 'u1', empresa_id: 'empresa-1' } as Profile);
      client.from.and.returnValue(fakeQueryResult(null, new Error('no autorizado')));

      await expectAsync(service.crear(input)).toBeRejectedWithError('no autorizado');
    });
  });

  describe('actualizar', () => {
    it('no lanza si la actualización tiene éxito', async () => {
      client.from.and.returnValue(fakeQueryResult(null, null));
      await expectAsync(service.actualizar('p1', { nombre: 'Nuevo nombre' })).toBeResolved();
    });

    it('lanza el error de Supabase si la actualización falla', async () => {
      client.from.and.returnValue(fakeQueryResult(null, new Error('no encontrado')));
      await expectAsync(service.actualizar('p1', { nombre: 'Nuevo nombre' })).toBeRejectedWithError('no encontrado');
    });
  });

  describe('cambiarActivo', () => {
    it('no lanza si la actualización tiene éxito', async () => {
      client.from.and.returnValue(fakeQueryResult(null, null));
      await expectAsync(service.cambiarActivo('p1', false)).toBeResolved();
    });

    it('lanza el error de Supabase si la actualización falla', async () => {
      client.from.and.returnValue(fakeQueryResult(null, new Error('no encontrado')));
      await expectAsync(service.cambiarActivo('p1', false)).toBeRejectedWithError('no encontrado');
    });
  });
});
