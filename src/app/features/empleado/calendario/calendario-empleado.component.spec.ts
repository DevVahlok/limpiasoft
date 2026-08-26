import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { Turno } from '../../../core/turnos/turno.models';
import { TurnosService } from '../../../core/turnos/turnos.service';
import { DiaTurnosComponent } from '../../../shared/dia-turnos/dia-turnos.component';
import { IncidenciaFormComponent } from '../incidencias/incidencia-form.component';
import { CalendarioEmpleadoComponent } from './calendario-empleado.component';

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

describe('CalendarioEmpleadoComponent', () => {
  let fixture: ComponentFixture<CalendarioEmpleadoComponent>;
  let component: CalendarioEmpleadoComponent;
  let turnosService: jasmine.SpyObj<TurnosService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  function crear() {
    turnosService = jasmine.createSpyObj('TurnosService', ['listarPorRango']);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);

    TestBed.configureTestingModule({
      imports: [CalendarioEmpleadoComponent],
      providers: [
        provideNoopAnimations(),
        { provide: TurnosService, useValue: turnosService },
        { provide: MatDialog, useValue: dialog },
      ],
    });
    // MatDialogModule (importado por el propio componente) crea una instancia real
    // de MatDialog que tapa el provider de arriba; hay que sobreescribirlo también
    // a nivel del propio componente.
    TestBed.overrideComponent(CalendarioEmpleadoComponent, {
      add: { providers: [{ provide: MatDialog, useValue: dialog }] },
    });
    fixture = TestBed.createComponent(CalendarioEmpleadoComponent);
    component = fixture.componentInstance;
  }

  it('onMesCambiado carga los turnos del rango recibido', async () => {
    crear();
    turnosService.listarPorRango.and.resolveTo([turno({ id: 't1' })]);

    await component.onMesCambiado({ desde: '2026-08-01', hasta: '2026-08-31', mesActual: new Date() });

    expect(turnosService.listarPorRango).toHaveBeenCalledWith('2026-08-01', '2026-08-31');
    expect(component.turnos()).toEqual([turno({ id: 't1' })]);
  });

  describe('onDiaClick', () => {
    beforeEach(async () => {
      crear();
      turnosService.listarPorRango.and.resolveTo([
        turno({ id: 't1', fecha: '2026-08-10' }),
        turno({ id: 't2', fecha: '2026-08-11' }),
      ]);
      await component.onMesCambiado({ desde: '2026-08-01', hasta: '2026-08-31', mesActual: new Date() });
    });

    it('abre el diálogo de turnos del día en modo solo lectura, con los turnos filtrados por fecha', () => {
      dialog.open.and.returnValue({ afterClosed: () => of(null) } as never);

      component.onDiaClick('2026-08-10');

      expect(dialog.open).toHaveBeenCalledWith(DiaTurnosComponent, {
        width: '480px',
        data: { fecha: '2026-08-10', turnos: [turno({ id: 't1', fecha: '2026-08-10' })], soloLectura: true },
      });
    });

    it('si el resultado pide reportar una incidencia, abre el formulario de incidencia con ese turno', () => {
      const turnoSeleccionado = turno({ id: 't1', fecha: '2026-08-10' });
      dialog.open.and.returnValues(
        { afterClosed: () => of({ cambios: false, accion: 'incidencia', turno: turnoSeleccionado }) } as never,
        { afterClosed: () => of(true) } as never
      );

      component.onDiaClick('2026-08-10');

      expect(dialog.open).toHaveBeenCalledWith(IncidenciaFormComponent, {
        width: '440px',
        data: { turno: turnoSeleccionado },
      });
    });

    it('si el resultado no pide una incidencia, no abre el formulario', () => {
      dialog.open.and.returnValue({ afterClosed: () => of({ cambios: true, accion: 'nuevo' }) } as never);

      component.onDiaClick('2026-08-10');

      expect(dialog.open).toHaveBeenCalledTimes(1);
    });

    it('sin resultado (diálogo cerrado sin acción), no abre el formulario', () => {
      dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as never);

      component.onDiaClick('2026-08-10');

      expect(dialog.open).toHaveBeenCalledTimes(1);
    });
  });
});
