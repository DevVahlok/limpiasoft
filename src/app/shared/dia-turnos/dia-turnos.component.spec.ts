import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { Turno } from '../../core/turnos/turno.models';
import { TurnosService } from '../../core/turnos/turnos.service';
import { DiaTurnosComponent, DiaTurnosData } from './dia-turnos.component';

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
    empleado: { nombre_completo: 'Ana Gómez' },
    puesto: { nombre: 'Oficina Centro' },
    ...overrides,
  };
}

describe('DiaTurnosComponent', () => {
  let fixture: ComponentFixture<DiaTurnosComponent>;
  let component: DiaTurnosComponent;
  let turnosService: jasmine.SpyObj<TurnosService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<DiaTurnosComponent>>;

  function crear(data: DiaTurnosData) {
    turnosService = jasmine.createSpyObj('TurnosService', ['eliminar']);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [DiaTurnosComponent],
      providers: [
        provideNoopAnimations(),
        { provide: TurnosService, useValue: turnosService },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    // MatSnackBarModule (importado por el propio componente) crea una instancia real
    // de MatSnackBar que tapa el provider de arriba; hay que sobreescribirlo también
    // a nivel del propio componente.
    TestBed.overrideComponent(DiaTurnosComponent, {
      add: { providers: [{ provide: MatSnackBar, useValue: snackBar }] },
    });
    fixture = TestBed.createComponent(DiaTurnosComponent);
    component = fixture.componentInstance;
  }

  it('inicializa la lista de turnos como copia independiente de los datos del diálogo', () => {
    const turnosOriginales = [turno({ id: 't1' })];
    crear({ fecha: '2026-08-10', turnos: turnosOriginales, soloLectura: false });

    expect(component.turnos).toEqual(turnosOriginales);
    expect(component.turnos).not.toBe(turnosOriginales);
  });

  describe('eliminar', () => {
    it('elimina el turno de la lista y marca cambios tras eliminarlo con éxito', async () => {
      crear({ fecha: '2026-08-10', turnos: [turno({ id: 't1' }), turno({ id: 't2' })], soloLectura: false });
      turnosService.eliminar.and.resolveTo();

      await component.eliminar(turno({ id: 't1' }));

      expect(turnosService.eliminar).toHaveBeenCalledWith('t1');
      expect(component.turnos.map((t) => t.id)).toEqual(['t2']);

      component.cerrar();
      expect(dialogRef.close).toHaveBeenCalledWith({ cambios: true });
    });

    it('muestra un snackbar si falla al eliminar y no quita el turno de la lista', async () => {
      crear({ fecha: '2026-08-10', turnos: [turno({ id: 't1' })], soloLectura: false });
      turnosService.eliminar.and.callFake(() => Promise.reject(new Error('turno ya completado')));

      await component.eliminar(turno({ id: 't1' }));

      expect(snackBar.open).toHaveBeenCalledWith('turno ya completado', 'Cerrar', { duration: 5000 });
      expect(component.turnos.length).toBe(1);

      component.cerrar();
      expect(dialogRef.close).toHaveBeenCalledWith({ cambios: false });
    });

    it('muestra un mensaje genérico si el error no es una instancia de Error', async () => {
      crear({ fecha: '2026-08-10', turnos: [turno({ id: 't1' })], soloLectura: false });
      turnosService.eliminar.and.callFake(() => Promise.reject('fallo desconocido'));

      await component.eliminar(turno({ id: 't1' }));

      expect(snackBar.open).toHaveBeenCalledWith('No se pudo eliminar el turno.', 'Cerrar', { duration: 5000 });
    });
  });

  it('nuevoTurno cierra el diálogo con la acción "nuevo" y la fecha del día', () => {
    crear({ fecha: '2026-08-10', turnos: [], soloLectura: false });

    component.nuevoTurno();

    expect(dialogRef.close).toHaveBeenCalledWith({ cambios: false, accion: 'nuevo', fecha: '2026-08-10' });
  });

  it('editarTurno cierra el diálogo con la acción "editar" y el turno', () => {
    crear({ fecha: '2026-08-10', turnos: [], soloLectura: false });
    const t = turno({ id: 't1' });

    component.editarTurno(t);

    expect(dialogRef.close).toHaveBeenCalledWith({ cambios: false, accion: 'editar', turno: t });
  });

  it('reportarIncidencia cierra el diálogo con la acción "incidencia" y el turno', () => {
    crear({ fecha: '2026-08-10', turnos: [], soloLectura: true });
    const t = turno({ id: 't1' });

    component.reportarIncidencia(t);

    expect(dialogRef.close).toHaveBeenCalledWith({ cambios: false, accion: 'incidencia', turno: t });
  });

  it('cerrar cierra el diálogo indicando si hubo cambios (sin acciones previas, cambios: false)', () => {
    crear({ fecha: '2026-08-10', turnos: [], soloLectura: false });

    component.cerrar();

    expect(dialogRef.close).toHaveBeenCalledWith({ cambios: false });
  });
});
