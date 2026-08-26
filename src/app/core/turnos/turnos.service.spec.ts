import { TestBed } from '@angular/core/testing';

import { SupabaseService } from '../supabase/supabase.service';
import { createFakeSupabaseClient, fakeQueryResult, fakeSupabaseService, FakeSupabaseClient } from '../../testing/supabase-test-utils';
import { Turno, TurnoInput } from './turno.models';
import { TurnosService } from './turnos.service';

describe('TurnosService', () => {
  let service: TurnosService;
  let client: FakeSupabaseClient;

  beforeEach(() => {
    client = createFakeSupabaseClient();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: fakeSupabaseService(client) }],
    });
    service = TestBed.inject(TurnosService);
  });

  describe('listarPorRango', () => {
    it('devuelve los turnos que llegan de Supabase', async () => {
      const turnos = [{ id: 't1' } as Turno];
      client.from.and.returnValue(fakeQueryResult(turnos, null));

      const resultado = await service.listarPorRango('2026-08-01', '2026-08-31');

      expect(client.from).toHaveBeenCalledWith('turnos');
      expect(resultado).toEqual(turnos);
    });

    it('lanza el error de Supabase si la consulta falla', async () => {
      client.from.and.returnValue(fakeQueryResult(null, new Error('fallo de red')));

      await expectAsync(service.listarPorRango('2026-08-01', '2026-08-31')).toBeRejectedWithError('fallo de red');
    });
  });

  describe('crear', () => {
    it('inserta el turno con el empresa_id indicado', async () => {
      client.from.and.returnValue(fakeQueryResult(null, null));
      const input: TurnoInput = {
        empleado_id: 'e1',
        puesto_id: 'p1',
        fecha: '2026-08-26',
        hora_inicio: '09:00',
        hora_fin: '17:00',
      };

      await service.crear(input, 'empresa-1');

      expect(client.from).toHaveBeenCalledWith('turnos');
    });

    it('lanza el error de Supabase si la inserción falla', async () => {
      client.from.and.returnValue(fakeQueryResult(null, new Error('no autorizado')));
      const input: TurnoInput = {
        empleado_id: 'e1',
        puesto_id: 'p1',
        fecha: '2026-08-26',
        hora_inicio: '09:00',
        hora_fin: '17:00',
      };

      await expectAsync(service.crear(input, 'empresa-1')).toBeRejectedWithError('no autorizado');
    });
  });

  describe('eliminar', () => {
    it('no lanza si el borrado tiene éxito', async () => {
      client.from.and.returnValue(fakeQueryResult(null, null));
      await expectAsync(service.eliminar('t1')).toBeResolved();
    });

    it('lanza el error de Supabase si el borrado falla', async () => {
      client.from.and.returnValue(fakeQueryResult(null, new Error('no encontrado')));
      await expectAsync(service.eliminar('t1')).toBeRejectedWithError('no encontrado');
    });
  });
});
