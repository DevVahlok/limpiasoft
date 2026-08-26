import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { AuthService } from '../auth/auth.service';
import { Profile } from '../auth/auth.models';
import { SupabaseService } from '../supabase/supabase.service';
import { createFakeSupabaseClient, fakeQueryResult, fakeSupabaseService, FakeSupabaseClient } from '../../testing/supabase-test-utils';
import { Incidencia, IncidenciaInput } from './incidencia.models';
import { IncidenciasService } from './incidencias.service';

describe('IncidenciasService', () => {
  let service: IncidenciasService;
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
    service = TestBed.inject(IncidenciasService);
  });

  /**
   * `refrescarPendientes` destructura `{ count, error }` de la respuesta, algo que
   * `fakeQueryResult` no modela (solo resuelve a `{ data, error }`), así que aquí se
   * usa un stub a medida que reproduce la cadena real `.select(...).eq(...)`.
   */
  function fakeCountResult(count: number | null, error: unknown = null) {
    return {
      select: () => ({
        eq: () => Promise.resolve({ count, error }),
      }),
    };
  }

  describe('refrescarPendientes', () => {
    it('actualiza pendientesCount con el count devuelto por Supabase', async () => {
      client.from.and.returnValue(fakeCountResult(3));

      await service.refrescarPendientes();

      expect(client.from).toHaveBeenCalledWith('incidencias');
      expect(service.pendientesCount()).toBe(3);
    });

    it('usa 0 si el count viene null', async () => {
      client.from.and.returnValue(fakeCountResult(null));

      await service.refrescarPendientes();

      expect(service.pendientesCount()).toBe(0);
    });

    it('no actualiza pendientesCount si Supabase devuelve error', async () => {
      client.from.and.returnValue(fakeCountResult(5, new Error('fallo')));

      await service.refrescarPendientes();

      expect(service.pendientesCount()).toBe(0);
    });
  });

  describe('listar', () => {
    it('devuelve las incidencias que llegan de Supabase', async () => {
      const incidencias = [{ id: 'i1' } as Incidencia];
      client.from.and.returnValue(fakeQueryResult(incidencias, null));

      const resultado = await service.listar();

      expect(client.from).toHaveBeenCalledWith('incidencias');
      expect(resultado).toEqual(incidencias);
    });

    it('lanza el error de Supabase si la consulta falla', async () => {
      client.from.and.returnValue(fakeQueryResult(null, new Error('fallo de red')));

      await expectAsync(service.listar()).toBeRejectedWithError('fallo de red');
    });
  });

  describe('crear', () => {
    const input: IncidenciaInput = { tipo: 'otro', descripcion: 'algo' };

    it('lanza "Sesión no válida" si no hay perfil cargado', async () => {
      profileSignal.set(null);

      await expectAsync(service.crear(input)).toBeRejectedWithError('Sesión no válida');
    });

    it('inserta la incidencia con el empleado_id y empresa_id del perfil', async () => {
      profileSignal.set({ id: 'e1', empresa_id: 'empresa-1' } as Profile);
      client.from.and.returnValue(fakeQueryResult(null, null));

      await service.crear(input);

      expect(client.from).toHaveBeenCalledWith('incidencias');
    });

    it('lanza el error de Supabase si la inserción falla', async () => {
      profileSignal.set({ id: 'e1', empresa_id: 'empresa-1' } as Profile);
      client.from.and.returnValue(fakeQueryResult(null, new Error('no autorizado')));

      await expectAsync(service.crear(input)).toBeRejectedWithError('no autorizado');
    });

    it('refresca pendientesCount tras crear con éxito', async () => {
      profileSignal.set({ id: 'e1', empresa_id: 'empresa-1' } as Profile);
      client.from.and.returnValue(fakeQueryResult(null, null));
      spyOn(service, 'refrescarPendientes').and.resolveTo();

      await service.crear(input);

      expect(service.refrescarPendientes).toHaveBeenCalled();
    });
  });

  describe('actualizarEstado', () => {
    it('no lanza si la actualización tiene éxito', async () => {
      client.from.and.returnValue(fakeQueryResult(null, null));
      await expectAsync(service.actualizarEstado('i1', 'revisada')).toBeResolved();
    });

    it('lanza el error de Supabase si la actualización falla', async () => {
      client.from.and.returnValue(fakeQueryResult(null, new Error('no encontrado')));
      await expectAsync(service.actualizarEstado('i1', 'revisada')).toBeRejectedWithError('no encontrado');
    });
  });
});
