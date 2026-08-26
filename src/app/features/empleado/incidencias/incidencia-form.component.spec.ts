import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { IncidenciasService } from '../../../core/incidencias/incidencias.service';
import { Turno } from '../../../core/turnos/turno.models';
import { TurnosService } from '../../../core/turnos/turnos.service';
import { IncidenciaFormComponent, IncidenciaFormData } from './incidencia-form.component';

function turno(overrides: Partial<Turno>): Turno {
  return {
    id: 't1',
    empresa_id: 'empresa-1',
    empleado_id: 'e1',
    puesto_id: 'p1',
    fecha: '2026-08-10',
    hora_inicio: '09:00',
    hora_fin: '17:00',
    estado: 'programado',
    notas: null,
    empleado: null,
    puesto: null,
    ...overrides,
  };
}

describe('IncidenciaFormComponent', () => {
  let fixture: ComponentFixture<IncidenciaFormComponent>;
  let component: IncidenciaFormComponent;
  let incidenciasService: jasmine.SpyObj<IncidenciasService>;
  let turnosService: jasmine.SpyObj<TurnosService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<IncidenciaFormComponent, boolean>>;

  function crear(data: IncidenciaFormData) {
    incidenciasService = jasmine.createSpyObj('IncidenciasService', ['crear']);
    turnosService = jasmine.createSpyObj('TurnosService', ['listarPorRango']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    turnosService.listarPorRango.and.resolveTo([]);

    TestBed.configureTestingModule({
      imports: [IncidenciaFormComponent],
      providers: [
        provideNoopAnimations(),
        { provide: IncidenciasService, useValue: incidenciasService },
        { provide: TurnosService, useValue: turnosService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(IncidenciaFormComponent);
    component = fixture.componentInstance;
  }

  it('inicializa el formulario con el id del turno recibido preseleccionado', () => {
    crear({ turno: turno({ id: 't1' }) });
    expect(component.form.getRawValue().turno_id).toBe('t1');
  });

  it('sin turno asociado, el campo turno_id empieza vacío', () => {
    crear({ turno: null });
    expect(component.form.getRawValue().turno_id).toBe('');
  });

  describe('ngOnInit', () => {
    it('carga los turnos disponibles y desactiva el spinner de carga', async () => {
      crear({ turno: null });
      turnosService.listarPorRango.and.resolveTo([turno({ id: 't2' })]);

      await component.ngOnInit();

      expect(turnosService.listarPorRango).toHaveBeenCalled();
      expect(component.turnos).toEqual([turno({ id: 't2' })]);
      expect(component.cargandoTurnos).toBe(false);
    });

    it('si el turno recibido por data no está en el rango cargado, lo añade al principio de la lista', async () => {
      const turnoData = turno({ id: 'fuera-de-rango' });
      crear({ turno: turnoData });
      turnosService.listarPorRango.and.resolveTo([turno({ id: 't2' })]);

      await component.ngOnInit();

      expect(component.turnos[0]).toEqual(turnoData);
      expect(component.turnos.length).toBe(2);
    });

    it('si el turno de data ya está en el rango cargado, no lo duplica', async () => {
      const turnoData = turno({ id: 't2' });
      crear({ turno: turnoData });
      turnosService.listarPorRango.and.resolveTo([turno({ id: 't2' })]);

      await component.ngOnInit();

      expect(component.turnos.length).toBe(1);
    });
  });

  describe('guardar', () => {
    it('no hace nada si el formulario es inválido (descripción vacía por defecto)', async () => {
      crear({ turno: null });

      await component.guardar();

      expect(incidenciasService.crear).not.toHaveBeenCalled();
    });

    it('guarda la incidencia y cierra el diálogo con true', async () => {
      crear({ turno: null });
      component.form.patchValue({ tipo: 'ausencia', descripcion: 'Me puse enfermo' });
      incidenciasService.crear.and.resolveTo();

      await component.guardar();

      expect(incidenciasService.crear).toHaveBeenCalledWith({
        turno_id: undefined,
        tipo: 'ausencia',
        descripcion: 'Me puse enfermo',
      });
      expect(dialogRef.close).toHaveBeenCalledWith(true);
      expect(component.guardando).toBe(false);
    });

    it('incluye el turno_id cuando se ha seleccionado un turno relacionado', async () => {
      crear({ turno: null });
      component.form.patchValue({ turno_id: 't9', tipo: 'otro', descripcion: 'algo pasó' });
      incidenciasService.crear.and.resolveTo();

      await component.guardar();

      expect(incidenciasService.crear).toHaveBeenCalledWith({
        turno_id: 't9',
        tipo: 'otro',
        descripcion: 'algo pasó',
      });
    });

    it('muestra un mensaje de error si falla al guardar y no cierra el diálogo', async () => {
      crear({ turno: null });
      component.form.patchValue({ tipo: 'otro', descripcion: 'algo' });
      incidenciasService.crear.and.callFake(() => Promise.reject(new Error('fallo de red')));

      await component.guardar();

      expect(component.errorMessage).toBe('fallo de red');
      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(component.guardando).toBe(false);
    });
  });

  it('cancelar cierra el diálogo con false', () => {
    crear({ turno: null });
    component.cancelar();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });
});
