import { TestBed } from '@angular/core/testing';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { SupabaseService } from '../supabase/supabase.service';
import { createFakeSupabaseClient, fakeSupabaseService, FakeSupabaseClient } from '../../testing/supabase-test-utils';
import { AdminPagosService } from './admin-pagos.service';
import { Pago } from './admin.models';

describe('AdminPagosService', () => {
  let service: AdminPagosService;
  let client: FakeSupabaseClient;

  beforeEach(() => {
    client = createFakeSupabaseClient();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: fakeSupabaseService(client) }],
    });
    service = TestBed.inject(AdminPagosService);
  });

  describe('listar', () => {
    it('invoca la Edge Function admin-pagos con op "list" y devuelve los pagos', async () => {
      const pagos = [{ id: '1', importe: 100 } as Pago];
      client.functions.invoke.and.resolveTo({ data: { pagos }, error: null });

      const resultado = await service.listar();

      expect(client.functions.invoke).toHaveBeenCalledWith('admin-pagos', { body: { op: 'list' } });
      expect(resultado).toEqual(pagos);
    });

    it('lanza un error legible si la Edge Function devuelve un error con body JSON', async () => {
      const response = new Response(JSON.stringify({ error: 'No autorizado.' }), { status: 403 });
      const error = new FunctionsHttpError(response);
      client.functions.invoke.and.resolveTo({ data: null, error });

      await expectAsync(service.listar()).toBeRejectedWithError('No autorizado.');
    });

    it('lanza "Respuesta vacía" si no hay error pero tampoco datos', async () => {
      client.functions.invoke.and.resolveTo({ data: null, error: null });

      await expectAsync(service.listar()).toBeRejectedWithError('Respuesta vacía');
    });
  });

  describe('crear', () => {
    it('envía op "create" con los datos del pago', async () => {
      const pago = { id: '2', importe: 250, fecha: '2026-08-01' } as Pago;
      client.functions.invoke.and.resolveTo({ data: { pago }, error: null });

      const resultado = await service.crear({ empresaId: 'e1', importe: 250, fecha: '2026-08-01', notas: 'Cuota agosto' });

      expect(client.functions.invoke).toHaveBeenCalledWith('admin-pagos', {
        body: { op: 'create', empresa_id: 'e1', importe: 250, fecha: '2026-08-01', notas: 'Cuota agosto' },
      });
      expect(resultado).toEqual(pago);
    });
  });

  describe('actualizar', () => {
    it('envía op "update" con el id y los datos actualizados', async () => {
      const pago = { id: '3', importe: 300 } as Pago;
      client.functions.invoke.and.resolveTo({ data: { pago }, error: null });

      const resultado = await service.actualizar('3', { importe: 300, fecha: '2026-08-05', notas: undefined });

      expect(client.functions.invoke).toHaveBeenCalledWith('admin-pagos', {
        body: { op: 'update', id: '3', importe: 300, fecha: '2026-08-05', notas: undefined },
      });
      expect(resultado).toEqual(pago);
    });
  });

  describe('eliminar', () => {
    it('envía op "delete" con el id', async () => {
      client.functions.invoke.and.resolveTo({ data: { ok: true }, error: null });

      await service.eliminar('4');

      expect(client.functions.invoke).toHaveBeenCalledWith('admin-pagos', { body: { op: 'delete', id: '4' } });
    });
  });
});
