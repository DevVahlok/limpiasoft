import { TestBed } from '@angular/core/testing';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { SupabaseService } from '../supabase/supabase.service';
import { createFakeSupabaseClient, fakeSupabaseService, FakeSupabaseClient } from '../../testing/supabase-test-utils';
import { AdminDesarrolladoresService } from './admin-desarrolladores.service';
import { AppAdmin } from './admin.models';

describe('AdminDesarrolladoresService', () => {
  let service: AdminDesarrolladoresService;
  let client: FakeSupabaseClient;

  beforeEach(() => {
    client = createFakeSupabaseClient();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: fakeSupabaseService(client) }],
    });
    service = TestBed.inject(AdminDesarrolladoresService);
  });

  describe('listar', () => {
    it('invoca la Edge Function admin-desarrolladores con op "list" y devuelve los desarrolladores', async () => {
      const desarrolladores = [{ id: '1', nombre_completo: 'Ana Gómez' } as AppAdmin];
      client.functions.invoke.and.resolveTo({ data: { desarrolladores }, error: null });

      const resultado = await service.listar();

      expect(client.functions.invoke).toHaveBeenCalledWith('admin-desarrolladores', { body: { op: 'list' } });
      expect(resultado).toEqual(desarrolladores);
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
    it('envía op "create" con los datos del formulario y devuelve la respuesta', async () => {
      client.functions.invoke.and.resolveTo({ data: { id: '2', email: 'nuevo@limpiasoft.app' }, error: null });

      const resultado = await service.crear({ email: 'nuevo@limpiasoft.app', password: 'clave1234', nombreCompleto: 'Luis Ruiz' });

      expect(client.functions.invoke).toHaveBeenCalledWith('admin-desarrolladores', {
        body: { op: 'create', email: 'nuevo@limpiasoft.app', password: 'clave1234', nombre_completo: 'Luis Ruiz' },
      });
      expect(resultado).toEqual({ id: '2', email: 'nuevo@limpiasoft.app' });
    });
  });

  describe('actualizar', () => {
    it('envía op "update" con el id y el nombre completo', async () => {
      const desarrollador = { id: '3', nombre_completo: 'Luis R. Actualizado' } as AppAdmin;
      client.functions.invoke.and.resolveTo({ data: { desarrollador }, error: null });

      const resultado = await service.actualizar('3', 'Luis R. Actualizado');

      expect(client.functions.invoke).toHaveBeenCalledWith('admin-desarrolladores', {
        body: { op: 'update', id: '3', nombre_completo: 'Luis R. Actualizado' },
      });
      expect(resultado).toEqual(desarrollador);
    });
  });

  describe('resetearPassword', () => {
    it('envía op "reset_password" con el id y la nueva contraseña', async () => {
      client.functions.invoke.and.resolveTo({ data: { ok: true }, error: null });

      await service.resetearPassword('4', 'nuevaClave123');

      expect(client.functions.invoke).toHaveBeenCalledWith('admin-desarrolladores', {
        body: { op: 'reset_password', id: '4', password: 'nuevaClave123' },
      });
    });
  });

  describe('eliminar', () => {
    it('envía op "delete" con el id', async () => {
      client.functions.invoke.and.resolveTo({ data: { ok: true }, error: null });

      await service.eliminar('5');

      expect(client.functions.invoke).toHaveBeenCalledWith('admin-desarrolladores', { body: { op: 'delete', id: '5' } });
    });
  });
});
