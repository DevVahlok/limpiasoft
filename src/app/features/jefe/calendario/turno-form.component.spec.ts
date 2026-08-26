import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { Profile } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { Turno } from '../../../core/turnos/turno.models';
import { TurnosService } from '../../../core/turnos/turnos.service';
import { EmpleadosService } from '../empleados/empleados.service';
import { Puesto, PuestosService } from '../puestos/puestos.service';
import { TurnoFormComponent, TurnoFormData } from './turno-form.component';

function turno(overrides: Partial<Turno>): Turno {
  return {
    id: 'turno-1',
    empresa_id: 'empresa-1',
    empleado_id: 'e1',
    puesto_id: 'p1',
    fecha: '2026-08-10',
    hora_inicio: '09:00:00',
    hora_fin: '17:00:00',
    estado: 'programado',
    notas: null,
    empleado: null,
    puesto: null,
    ...overrides,
  };
}

function puesto(overrides: Partial<Puesto>): Puesto {
  return {
    id: 'p1',
    empresa_id: 'empresa-1',
    nombre: 'Oficina',
    direccion: null,
    notas: null,
    activo: true,
    created_at: '2026-01-01',
    ...overrides,
  };
}

describe('TurnoFormComponent', () => {
  let fixture: ComponentFixture<TurnoFormComponent>;
  let component: TurnoFormComponent;
  let turnosService: jasmine.SpyObj<TurnosService>;
  let empleadosService: jasmine.SpyObj<EmpleadosService>;
  let puestosService: jasmine.SpyObj<PuestosService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<TurnoFormComponent, boolean>>;
  let profile: jasmine.Spy;

  function crear(data: TurnoFormData, opciones: { empleados?: Profile[]; puestos?: Puesto[]; sinSesion?: boolean } = {}) {
    turnosService = jasmine.createSpyObj('TurnosService', ['crear', 'actualizar']);
    empleadosService = jasmine.createSpyObj('EmpleadosService', ['listar']);
    puestosService = jasmine.createSpyObj('PuestosService', ['listar']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    profile = jasmine.createSpy('profile').and.returnValue(opciones.sinSesion ? null : { empresa_id: 'empresa-1' });

    empleadosService.listar.and.resolveTo(opciones.empleados ?? []);
    puestosService.listar.and.resolveTo(opciones.puestos ?? []);

    TestBed.configureTestingModule({
      imports: [TurnoFormComponent],
      providers: [
        { provide: TurnosService, useValue: turnosService },
        { provide: EmpleadosService, useValue: empleadosService },
        { provide: PuestosService, useValue: puestosService },
        { provide: AuthService, useValue: { profile } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(TurnoFormComponent);
    component = fixture.componentInstance;
  }

  it('esEdicion es true cuando se pasa un turno existente', () => {
    crear({ turno: turno({}) });
    expect(component.esEdicion).toBe(true);
  });

  it('esEdicion es false para un turno nuevo', () => {
    crear({ turno: null });
    expect(component.esEdicion).toBe(false);
  });

  it('precarga el formulario con los datos del turno a editar', () => {
    crear({ turno: turno({ empleado_id: 'e9', puesto_id: 'p9', fecha: '2026-08-20', hora_inicio: '08:30:00', hora_fin: '12:15:00', notas: 'urgente' }) });
    expect(component.form.getRawValue()).toEqual({
      empleado_id: 'e9',
      puesto_id: 'p9',
      fecha: '2026-08-20',
      hora_inicio: '08:30',
      hora_fin: '12:15',
      estado: 'programado',
      notas: 'urgente',
    });
  });

  it('con turno nuevo, usa la fecha predefinida y horario por defecto', () => {
    crear({ turno: null, fechaPredefinida: '2026-08-25' });
    expect(component.form.getRawValue().fecha).toBe('2026-08-25');
    expect(component.form.getRawValue().hora_inicio).toBe('09:00');
    expect(component.form.getRawValue().hora_fin).toBe('13:00');
  });

  describe('ngOnInit', () => {
    it('carga empleados y puestos activos', async () => {
      crear(
        { turno: null },
        {
          empleados: [{ id: 'e1', nombre_completo: 'Ana' } as Profile],
          puestos: [puesto({ id: 'p1', activo: true }), puesto({ id: 'p2', activo: false })],
        }
      );
      await component.ngOnInit();
      expect(component.empleados.length).toBe(1);
      expect(component.puestos).toEqual([puesto({ id: 'p1', activo: true })]);
      expect(component.cargandoListas).toBe(false);
    });

    it('mantiene el puesto inactivo del turno que se está editando', async () => {
      crear(
        { turno: turno({ puesto_id: 'p2' }) },
        { puestos: [puesto({ id: 'p1', activo: true }), puesto({ id: 'p2', activo: false })] }
      );
      await component.ngOnInit();
      expect(component.puestos.map((p) => p.id).sort()).toEqual(['p1', 'p2']);
    });
  });

  describe('guardar', () => {
    it('no hace nada si el formulario es inválido', async () => {
      crear({ turno: null });
      component.form.controls.empleado_id.setValue('');

      await component.guardar();

      expect(turnosService.crear).not.toHaveBeenCalled();
    });

    it('muestra un error si la hora de fin no es posterior a la de inicio', async () => {
      crear({ turno: null });
      component.form.setValue({
        empleado_id: 'e1',
        puesto_id: 'p1',
        fecha: '2026-08-10',
        hora_inicio: '10:00',
        hora_fin: '09:00',
        estado: 'programado',
        notas: '',
      });

      await component.guardar();

      expect(component.errorMessage).toBe('La hora de fin debe ser posterior a la de inicio.');
      expect(turnosService.crear).not.toHaveBeenCalled();
    });

    it('crea un turno nuevo con la empresa del jefe y cierra el diálogo', async () => {
      crear({ turno: null });
      turnosService.crear.and.resolveTo();
      component.form.setValue({
        empleado_id: 'e1',
        puesto_id: 'p1',
        fecha: '2026-08-10',
        hora_inicio: '09:00',
        hora_fin: '13:00',
        estado: 'programado',
        notas: '',
      });

      await component.guardar();

      expect(turnosService.crear).toHaveBeenCalledWith(
        { empleado_id: 'e1', puesto_id: 'p1', fecha: '2026-08-10', hora_inicio: '09:00', hora_fin: '13:00', notas: undefined },
        'empresa-1'
      );
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('si no hay sesión válida al crear, muestra un error y no cierra', async () => {
      crear({ turno: null }, { sinSesion: true });
      component.form.setValue({
        empleado_id: 'e1',
        puesto_id: 'p1',
        fecha: '2026-08-10',
        hora_inicio: '09:00',
        hora_fin: '13:00',
        estado: 'programado',
        notas: '',
      });

      await component.guardar();

      expect(turnosService.crear).not.toHaveBeenCalled();
      expect(component.errorMessage).toBe('Sesión no válida');
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('actualiza un turno existente incluyendo el estado', async () => {
      crear({ turno: turno({ id: 't1' }) });
      turnosService.actualizar.and.resolveTo();
      component.form.setValue({
        empleado_id: 'e1',
        puesto_id: 'p1',
        fecha: '2026-08-10',
        hora_inicio: '09:00',
        hora_fin: '13:00',
        estado: 'completado',
        notas: 'nota',
      });

      await component.guardar();

      expect(turnosService.actualizar).toHaveBeenCalledWith('t1', {
        empleado_id: 'e1',
        puesto_id: 'p1',
        fecha: '2026-08-10',
        hora_inicio: '09:00',
        hora_fin: '13:00',
        notas: 'nota',
        estado: 'completado',
      });
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('si el servicio falla, muestra el mensaje de error y no cierra el diálogo', async () => {
      crear({ turno: null });
      turnosService.crear.and.callFake(() => Promise.reject(new Error('el puesto ya no existe')));
      component.form.setValue({
        empleado_id: 'e1',
        puesto_id: 'p1',
        fecha: '2026-08-10',
        hora_inicio: '09:00',
        hora_fin: '13:00',
        estado: 'programado',
        notas: '',
      });

      await component.guardar();

      expect(component.errorMessage).toBe('el puesto ya no existe');
      expect(component.guardando).toBe(false);
      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });

  it('cancelar cierra el diálogo con false', () => {
    crear({ turno: null });
    component.cancelar();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });
});
