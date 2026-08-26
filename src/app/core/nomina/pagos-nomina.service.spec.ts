import { TestBed } from '@angular/core/testing';

import { SupabaseService } from '../supabase/supabase.service';
import { createFakeSupabaseClient, fakeQueryResult, fakeSupabaseService, FakeSupabaseClient } from '../../testing/supabase-test-utils';
import { PagoNomina, PagosNominaService } from './pagos-nomina.service';

describe('PagosNominaService', () => {
  let service: PagosNominaService;
  let client: FakeSupabaseClient;

  beforeEach(() => {
    client = createFakeSupabaseClient();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: fakeSupabaseService(client) }],
    });
    service = TestBed.inject(PagosNominaService);
  });

  describe('listarPorMes', () => {
    it('devuelve los pagos del mes indicado', async () => {
      const pagos = [{ id: 'p1', empresa_id: 'empresa-1', empleado_id: 'e1', mes: '2026-08-01' } as PagoNomina];
      client.from.and.returnValue(fakeQueryResult(pagos, null));

      const resultado = await service.listarPorMes('2026-08');

      expect(client.from).toHaveBeenCalledWith('pagos_nomina');
      expect(resultado).toEqual(pagos);
    });

    it('lanza el error de Supabase si la consulta falla', async () => {
      client.from.and.returnValue(fakeQueryResult(null, new Error('fallo de red')));

      await expectAsync(service.listarPorMes('2026-08')).toBeRejectedWithError('fallo de red');
    });
  });

  describe('marcarPagado', () => {
    it('inserta el pago y devuelve el registro creado', async () => {
      const pago = { id: 'p1', empresa_id: 'empresa-1', empleado_id: 'e1', mes: '2026-08-01' } as PagoNomina;
      client.from.and.returnValue(fakeQueryResult(pago, null));

      const resultado = await service.marcarPagado('empresa-1', 'e1', '2026-08');

      expect(client.from).toHaveBeenCalledWith('pagos_nomina');
      expect(resultado).toEqual(pago);
    });

    it('lanza el error de Supabase si la inserción falla', async () => {
      client.from.and.returnValue(fakeQueryResult(null, new Error('ya estaba pagado')));

      await expectAsync(service.marcarPagado('empresa-1', 'e1', '2026-08')).toBeRejectedWithError('ya estaba pagado');
    });
  });

  describe('desmarcarPagado', () => {
    it('no lanza si el borrado tiene éxito', async () => {
      client.from.and.returnValue(fakeQueryResult(null, null));
      await expectAsync(service.desmarcarPagado('p1')).toBeResolved();
    });

    it('lanza el error de Supabase si el borrado falla', async () => {
      client.from.and.returnValue(fakeQueryResult(null, new Error('no encontrado')));
      await expectAsync(service.desmarcarPagado('p1')).toBeRejectedWithError('no encontrado');
    });
  });
});
