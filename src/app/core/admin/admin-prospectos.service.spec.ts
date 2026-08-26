import { TestBed } from '@angular/core/testing';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { SupabaseService } from '../supabase/supabase.service';
import { createFakeSupabaseClient, fakeSupabaseService, FakeSupabaseClient } from '../../testing/supabase-test-utils';
import { AdminProspectosService } from './admin-prospectos.service';
import { Prospecto } from './admin.models';

describe('AdminProspectosService', () => {
  let service: AdminProspectosService;
  let client: FakeSupabaseClient;

  beforeEach(() => {
    client = createFakeSupabaseClient();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: fakeSupabaseService(client) }],
    });
    service = TestBed.inject(AdminProspectosService);
  });

  describe('listarPorCiudad', () => {
    it('invoca la Edge Function admin-prospectos con op "list" y la ciudad indicada', async () => {
      const prospectos = [{ id: '1', nombre: 'Bar Central', ciudad: 'Jerez de la Frontera' } as Prospecto];
      client.functions.invoke.and.resolveTo({ data: { prospectos }, error: null });

      const resultado = await service.listarPorCiudad('Jerez de la Frontera');

      expect(client.functions.invoke).toHaveBeenCalledWith('admin-prospectos', {
        body: { op: 'list', ciudad: 'Jerez de la Frontera' },
      });
      expect(resultado).toEqual(prospectos);
    });

    it('lanza un error legible si la Edge Function devuelve un error con body JSON', async () => {
      const response = new Response(JSON.stringify({ error: 'No autorizado.' }), { status: 403 });
      const error = new FunctionsHttpError(response);
      client.functions.invoke.and.resolveTo({ data: null, error });

      await expectAsync(service.listarPorCiudad('Cádiz')).toBeRejectedWithError('No autorizado.');
    });

    it('lanza "Respuesta vacía" si no hay error pero tampoco datos', async () => {
      client.functions.invoke.and.resolveTo({ data: null, error: null });

      await expectAsync(service.listarPorCiudad('Cádiz')).toBeRejectedWithError('Respuesta vacía');
    });
  });

  describe('crear', () => {
    it('envía op "create" junto con todos los campos del formulario', async () => {
      const prospecto = { id: '2', nombre: 'Panadería Luz' } as Prospecto;
      client.functions.invoke.and.resolveTo({ data: { prospecto }, error: null });

      const params = {
        nombre: 'Panadería Luz',
        ciudad: 'Rota',
        direccion: 'Calle Mayor 1',
        telefono: '600111222',
        web: 'https://panaderialuz.example',
        notas: 'Contactar por la mañana',
        lat: 36.6222,
        lng: -6.355,
      };
      const resultado = await service.crear(params);

      expect(client.functions.invoke).toHaveBeenCalledWith('admin-prospectos', { body: { op: 'create', ...params } });
      expect(resultado).toEqual(prospecto);
    });

    it('envía únicamente los campos opcionales presentes', async () => {
      client.functions.invoke.and.resolveTo({ data: { prospecto: {} }, error: null });

      await service.crear({ nombre: 'Ferretería Sur', ciudad: 'San Fernando' });

      expect(client.functions.invoke).toHaveBeenCalledWith('admin-prospectos', {
        body: { op: 'create', nombre: 'Ferretería Sur', ciudad: 'San Fernando' },
      });
    });
  });

  describe('actualizar', () => {
    it('envía op "update" con el id y los campos del formulario', async () => {
      const prospecto = { id: '3', nombre: 'Panadería Luz 2' } as Prospecto;
      client.functions.invoke.and.resolveTo({ data: { prospecto }, error: null });

      const params = { nombre: 'Panadería Luz 2', ciudad: 'Rota' };
      const resultado = await service.actualizar('3', params);

      expect(client.functions.invoke).toHaveBeenCalledWith('admin-prospectos', {
        body: { op: 'update', id: '3', ...params },
      });
      expect(resultado).toEqual(prospecto);
    });
  });

  describe('eliminar', () => {
    it('envía op "delete" con el id', async () => {
      client.functions.invoke.and.resolveTo({ data: { ok: true }, error: null });

      await service.eliminar('4');

      expect(client.functions.invoke).toHaveBeenCalledWith('admin-prospectos', { body: { op: 'delete', id: '4' } });
    });
  });
});
