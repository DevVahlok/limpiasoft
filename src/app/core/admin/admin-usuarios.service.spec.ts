import { TestBed } from '@angular/core/testing';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { SupabaseService } from '../supabase/supabase.service';
import { createFakeSupabaseClient, fakeSupabaseService, FakeSupabaseClient } from '../../testing/supabase-test-utils';
import { AdminUsuariosService } from './admin-usuarios.service';
import { Profile } from '../auth/auth.models';

describe('AdminUsuariosService', () => {
  let service: AdminUsuariosService;
  let client: FakeSupabaseClient;

  beforeEach(() => {
    client = createFakeSupabaseClient();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: fakeSupabaseService(client) }],
    });
    service = TestBed.inject(AdminUsuariosService);
  });

  describe('listar', () => {
    it('invoca la Edge Function admin-usuarios con op "list" y el id de la empresa', async () => {
      const usuarios = [{ id: '1', nombre_completo: 'Ana Gómez' } as Profile];
      client.functions.invoke.and.resolveTo({ data: { usuarios }, error: null });

      const resultado = await service.listar('empresa-1');

      expect(client.functions.invoke).toHaveBeenCalledWith('admin-usuarios', {
        body: { op: 'list', empresa_id: 'empresa-1' },
      });
      expect(resultado).toEqual(usuarios);
    });

    it('lanza un error legible si la Edge Function devuelve un error con body JSON', async () => {
      const response = new Response(JSON.stringify({ error: 'No autorizado.' }), { status: 403 });
      const error = new FunctionsHttpError(response);
      client.functions.invoke.and.resolveTo({ data: null, error });

      await expectAsync(service.listar('empresa-1')).toBeRejectedWithError('No autorizado.');
    });

    it('lanza "Respuesta vacía" si no hay error pero tampoco datos', async () => {
      client.functions.invoke.and.resolveTo({ data: null, error: null });

      await expectAsync(service.listar('empresa-1')).toBeRejectedWithError('Respuesta vacía');
    });
  });

  describe('crear', () => {
    it('envía op "create" con los datos del formulario y devuelve la respuesta', async () => {
      client.functions.invoke.and.resolveTo({ data: { id: '2', username: 'ana.gomez' }, error: null });

      const resultado = await service.crear({
        empresaId: 'empresa-1',
        nombreCompleto: 'Ana Gómez',
        telefono: '600111222',
        rol: 'empleado',
        pin: '1234',
      });

      expect(client.functions.invoke).toHaveBeenCalledWith('admin-usuarios', {
        body: {
          op: 'create',
          empresa_id: 'empresa-1',
          nombre_completo: 'Ana Gómez',
          telefono: '600111222',
          rol: 'empleado',
          pin: '1234',
        },
      });
      expect(resultado).toEqual({ id: '2', username: 'ana.gomez' });
    });
  });

  describe('actualizar', () => {
    it('envía op "update" con el id y los campos actualizados', async () => {
      const usuario = { id: '3', nombre_completo: 'Ana G. Actualizado' } as Profile;
      client.functions.invoke.and.resolveTo({ data: { usuario }, error: null });

      const resultado = await service.actualizar('3', {
        nombreCompleto: 'Ana G. Actualizado',
        telefono: '600111222',
        rol: 'jefe',
        activo: true,
      });

      expect(client.functions.invoke).toHaveBeenCalledWith('admin-usuarios', {
        body: {
          op: 'update',
          id: '3',
          nombre_completo: 'Ana G. Actualizado',
          telefono: '600111222',
          rol: 'jefe',
          activo: true,
        },
      });
      expect(resultado).toEqual(usuario);
    });
  });

  describe('resetearPin', () => {
    it('envía op "reset_pin" con el id y el nuevo PIN', async () => {
      client.functions.invoke.and.resolveTo({ data: { ok: true }, error: null });

      await service.resetearPin('4', '5678');

      expect(client.functions.invoke).toHaveBeenCalledWith('admin-usuarios', {
        body: { op: 'reset_pin', id: '4', pin: '5678' },
      });
    });
  });

  describe('eliminar', () => {
    it('envía op "delete" con el id', async () => {
      client.functions.invoke.and.resolveTo({ data: { ok: true }, error: null });

      await service.eliminar('5');

      expect(client.functions.invoke).toHaveBeenCalledWith('admin-usuarios', { body: { op: 'delete', id: '5' } });
    });
  });
});
