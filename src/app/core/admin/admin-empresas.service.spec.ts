import { TestBed } from '@angular/core/testing';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { SupabaseService } from '../supabase/supabase.service';
import { createFakeSupabaseClient, fakeSupabaseService, FakeSupabaseClient } from '../../testing/supabase-test-utils';
import { AdminEmpresasService } from './admin-empresas.service';
import { Empresa } from './admin.models';

describe('AdminEmpresasService', () => {
  let service: AdminEmpresasService;
  let client: FakeSupabaseClient;

  beforeEach(() => {
    client = createFakeSupabaseClient();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: fakeSupabaseService(client) }],
    });
    service = TestBed.inject(AdminEmpresasService);
  });

  describe('listar', () => {
    it('invoca la Edge Function admin-empresas con op "list" y devuelve las empresas', async () => {
      const empresas = [{ id: '1', nombre: 'Limpiezas Prueba' } as Empresa];
      client.functions.invoke.and.resolveTo({ data: { empresas }, error: null });

      const resultado = await service.listar();

      expect(client.functions.invoke).toHaveBeenCalledWith('admin-empresas', { body: { op: 'list' } });
      expect(resultado).toEqual(empresas);
    });

    it('lanza un error legible si la Edge Function devuelve un error con body JSON', async () => {
      const response = new Response(JSON.stringify({ error: 'Esta cuenta no tiene acceso de desarrollador.' }), {
        status: 403,
      });
      const error = new FunctionsHttpError(response);
      client.functions.invoke.and.resolveTo({ data: null, error });

      await expectAsync(service.listar()).toBeRejectedWithError('Esta cuenta no tiene acceso de desarrollador.');
    });

    it('lanza "Respuesta vacía" si no hay error pero tampoco datos', async () => {
      client.functions.invoke.and.resolveTo({ data: null, error: null });

      await expectAsync(service.listar()).toBeRejectedWithError('Respuesta vacía');
    });
  });

  describe('crear', () => {
    it('envía op "create" junto con los parámetros', async () => {
      const empresa = { id: '2', nombre: 'Nueva Empresa' } as Empresa;
      client.functions.invoke.and.resolveTo({ data: { empresa }, error: null });

      const resultado = await service.crear({ nombre: 'Nueva Empresa' });

      expect(client.functions.invoke).toHaveBeenCalledWith('admin-empresas', {
        body: { op: 'create', nombre: 'Nueva Empresa' },
      });
      expect(resultado).toEqual(empresa);
    });
  });

  describe('cambiarPausa', () => {
    it('envía op "update" con el id y el nuevo estado de pausa', async () => {
      const empresa = { id: '3', pausada: true } as Empresa;
      client.functions.invoke.and.resolveTo({ data: { empresa }, error: null });

      const resultado = await service.cambiarPausa('3', true);

      expect(client.functions.invoke).toHaveBeenCalledWith('admin-empresas', {
        body: { op: 'update', id: '3', pausada: true },
      });
      expect(resultado.pausada).toBe(true);
    });
  });

  describe('eliminar', () => {
    it('envía op "delete" con el id', async () => {
      client.functions.invoke.and.resolveTo({ data: { ok: true }, error: null });

      await service.eliminar('4');

      expect(client.functions.invoke).toHaveBeenCalledWith('admin-empresas', { body: { op: 'delete', id: '4' } });
    });
  });
});
