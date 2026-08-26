import { TestBed } from '@angular/core/testing';

import { Profile } from '../../../core/auth/auth.models';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import {
  createFakeSupabaseClient,
  fakeQueryResult,
  fakeSupabaseService,
  FakeSupabaseClient,
} from '../../../testing/supabase-test-utils';
import { CrearEmpleadoParams, CrearEmpleadoResultado, EmpleadosService } from './empleados.service';

describe('EmpleadosService', () => {
  let service: EmpleadosService;
  let client: FakeSupabaseClient;

  beforeEach(() => {
    client = createFakeSupabaseClient();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: fakeSupabaseService(client) }],
    });
    service = TestBed.inject(EmpleadosService);
  });

  describe('listar', () => {
    it('devuelve solo los perfiles con rol empleado', async () => {
      const empleados = [{ id: 'e1', rol: 'empleado' } as Profile];
      client.from.and.returnValue(fakeQueryResult(empleados, null));

      const resultado = await service.listar();

      expect(client.from).toHaveBeenCalledWith('profiles');
      expect(resultado).toEqual(empleados);
    });

    it('lanza el error de Supabase si la consulta falla', async () => {
      client.from.and.returnValue(fakeQueryResult(null, new Error('fallo de red')));

      await expectAsync(service.listar()).toBeRejectedWithError('fallo de red');
    });
  });

  describe('listarUsuarios', () => {
    it('devuelve empleados y jefes juntos', async () => {
      const usuarios = [{ id: 'j1', rol: 'jefe' } as Profile, { id: 'e1', rol: 'empleado' } as Profile];
      client.from.and.returnValue(fakeQueryResult(usuarios, null));

      const resultado = await service.listarUsuarios();

      expect(client.from).toHaveBeenCalledWith('profiles');
      expect(resultado).toEqual(usuarios);
    });

    it('lanza el error de Supabase si la consulta falla', async () => {
      client.from.and.returnValue(fakeQueryResult(null, new Error('fallo de red')));

      await expectAsync(service.listarUsuarios()).toBeRejectedWithError('fallo de red');
    });
  });

  describe('crear', () => {
    const params: CrearEmpleadoParams = {
      nombreCompleto: 'Ana Gómez',
      telefono: '600111222',
      tarifaHora: 10,
      pin: '1234',
      rol: 'empleado',
    };

    it('invoca la Edge Function crear-empleado con los datos mapeados', async () => {
      const resultado: CrearEmpleadoResultado = { id: 'e1', username: 'ana.gomez' };
      client.functions.invoke.and.resolveTo({ data: resultado, error: null });

      const respuesta = await service.crear(params);

      expect(client.functions.invoke).toHaveBeenCalledWith('crear-empleado', {
        body: {
          nombre_completo: 'Ana Gómez',
          telefono: '600111222',
          tarifa_hora: 10,
          pin: '1234',
          rol: 'empleado',
        },
      });
      expect(respuesta).toEqual(resultado);
    });

    it('lanza el error de la Edge Function si falla', async () => {
      client.functions.invoke.and.resolveTo({ data: null, error: new Error('nombre duplicado') });

      await expectAsync(service.crear(params)).toBeRejectedWithError('nombre duplicado');
    });

    it('lanza "Respuesta vacía al crear el empleado" si no hay error pero tampoco datos', async () => {
      client.functions.invoke.and.resolveTo({ data: null, error: null });

      await expectAsync(service.crear(params)).toBeRejectedWithError('Respuesta vacía al crear el empleado');
    });
  });
});
