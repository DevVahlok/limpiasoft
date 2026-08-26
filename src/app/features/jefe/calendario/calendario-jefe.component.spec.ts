import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { Profile } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { Turno } from '../../../core/turnos/turno.models';
import { TurnosService } from '../../../core/turnos/turnos.service';
import { DiaTurnosComponent, DiaTurnosResultado } from '../../../shared/dia-turnos/dia-turnos.component';
import { RangoMes } from '../../../shared/calendario-mes/calendario-mes.component';
import { EmpleadosService } from '../empleados/empleados.service';
import { CalendarioJefeComponent } from './calendario-jefe.component';
import { TurnoFormComponent } from './turno-form.component';

function empleado(id: string, nombre: string): Profile {
  return { id, nombre_completo: nombre } as Profile;
}

function turno(overrides: Partial<Turno>): Turno {
  return {
    id: 'turno-1',
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

const RANGO: RangoMes = { desde: '2026-08-01', hasta: '2026-08-31', mesActual: new Date('2026-08-01') };

describe('CalendarioJefeComponent', () => {
  let fixture: ComponentFixture<CalendarioJefeComponent>;
  let component: CalendarioJefeComponent;
  let turnosService: jasmine.SpyObj<TurnosService>;
  let empleadosService: jasmine.SpyObj<EmpleadosService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let empresaPausada: jasmine.Spy;

  function crear(datos: { empleados?: Profile[]; turnos?: Turno[]; pausada?: boolean } = {}) {
    turnosService = jasmine.createSpyObj('TurnosService', ['listarPorRango']);
    empleadosService = jasmine.createSpyObj('EmpleadosService', ['listar']);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    empresaPausada = jasmine.createSpy('empresaPausada').and.returnValue(datos.pausada ?? false);

    empleadosService.listar.and.resolveTo(datos.empleados ?? []);
    turnosService.listarPorRango.and.resolveTo(datos.turnos ?? []);

    TestBed.configureTestingModule({
      imports: [CalendarioJefeComponent],
      providers: [
        { provide: TurnosService, useValue: turnosService },
        { provide: EmpleadosService, useValue: empleadosService },
        { provide: MatDialog, useValue: dialog },
        { provide: AuthService, useValue: { empresaPausada } },
      ],
    });
    // MatDialogModule (importado por el propio componente) declara MatDialog con
    // `providedIn: MatDialogModule` en vez de 'root', así que hay que sobreescribirlo
    // también a nivel del propio componente para que gane sobre ese import.
    TestBed.overrideComponent(CalendarioJefeComponent, {
      add: { providers: [{ provide: MatDialog, useValue: dialog }] },
    });
    fixture = TestBed.createComponent(CalendarioJefeComponent);
    component = fixture.componentInstance;
  }

  it('ngOnInit carga los empleados', async () => {
    crear({ empleados: [empleado('e1', 'Ana Gómez')] });
    await component.ngOnInit();
    expect(component.empleados()).toEqual([empleado('e1', 'Ana Gómez')]);
  });

  it('onMesCambiado guarda el rango y recarga los turnos de ese rango', async () => {
    crear({ turnos: [turno({ id: 't1' })] });
    await component.onMesCambiado(RANGO);
    expect(turnosService.listarPorRango).toHaveBeenCalledWith('2026-08-01', '2026-08-31');
    expect(component.turnos()).toEqual([turno({ id: 't1' })]);
  });

  describe('turnosFiltrados', () => {
    it('sin empleado seleccionado devuelve todos los turnos', async () => {
      crear({ turnos: [turno({ id: 't1', empleado_id: 'e1' }), turno({ id: 't2', empleado_id: 'e2' })] });
      await component.onMesCambiado(RANGO);
      expect(component.turnosFiltrados().length).toBe(2);
    });

    it('con empleado seleccionado filtra solo sus turnos', async () => {
      crear({ turnos: [turno({ id: 't1', empleado_id: 'e1' }), turno({ id: 't2', empleado_id: 'e2' })] });
      await component.onMesCambiado(RANGO);
      component.empleadoSeleccionado.set('e2');
      expect(component.turnosFiltrados()).toEqual([turno({ id: 't2', empleado_id: 'e2' })]);
    });
  });

  describe('abrirNuevoTurno', () => {
    it('abre TurnoFormComponent sin turno preexistente', async () => {
      crear();
      dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);

      component.abrirNuevoTurno();

      expect(dialog.open).toHaveBeenCalledWith(TurnoFormComponent, { width: '420px', data: { turno: null } });
    });

    it('si se guarda, recarga los turnos del rango actual', async () => {
      crear({ turnos: [turno({ id: 't-nuevo' })] });
      await component.onMesCambiado(RANGO); // fija el rango
      turnosService.listarPorRango.calls.reset();
      dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);

      component.abrirNuevoTurno();
      await fixture.whenStable();

      expect(turnosService.listarPorRango).toHaveBeenCalledWith('2026-08-01', '2026-08-31');
    });

    it('si se cancela, no recarga', async () => {
      crear();
      await component.onMesCambiado(RANGO);
      turnosService.listarPorRango.calls.reset();
      dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);

      component.abrirNuevoTurno();
      await fixture.whenStable();

      expect(turnosService.listarPorRango).not.toHaveBeenCalled();
    });
  });

  describe('onDiaClick', () => {
    it('abre DiaTurnosComponent con los turnos del día filtrados por empleado seleccionado', async () => {
      crear({
        turnos: [
          turno({ id: 't1', fecha: '2026-08-10', empleado_id: 'e1' }),
          turno({ id: 't2', fecha: '2026-08-10', empleado_id: 'e2' }),
          turno({ id: 't3', fecha: '2026-08-11', empleado_id: 'e1' }),
        ],
        pausada: true,
      });
      await component.onMesCambiado(RANGO);
      component.empleadoSeleccionado.set('e1');
      dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as never);

      component.onDiaClick('2026-08-10');

      expect(dialog.open).toHaveBeenCalledWith(DiaTurnosComponent, {
        width: '480px',
        data: {
          fecha: '2026-08-10',
          turnos: [turno({ id: 't1', fecha: '2026-08-10', empleado_id: 'e1' })],
          soloLectura: false,
          pausada: true,
        },
      });
    });

    it('si el resultado no tiene datos, no hace nada más', async () => {
      crear();
      await component.onMesCambiado(RANGO);
      dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as never);

      component.onDiaClick('2026-08-10');
      await fixture.whenStable();

      expect(dialog.open).toHaveBeenCalledTimes(1);
    });

    it('accion "nuevo" abre TurnoFormComponent con la fecha predefinida', async () => {
      crear();
      await component.onMesCambiado(RANGO);
      const resultado: DiaTurnosResultado = { cambios: false, accion: 'nuevo', fecha: '2026-08-15' };
      dialog.open.and.returnValues(
        { afterClosed: () => of(resultado) } as never,
        { afterClosed: () => of(undefined) } as never
      );

      component.onDiaClick('2026-08-10');

      expect(dialog.open).toHaveBeenCalledTimes(2);
      expect(dialog.open.calls.argsFor(1)).toEqual([
        TurnoFormComponent,
        { width: '420px', data: { turno: null, fechaPredefinida: '2026-08-15' } },
      ]);
    });

    it('accion "editar" abre TurnoFormComponent con el turno a editar', async () => {
      crear();
      await component.onMesCambiado(RANGO);
      const turnoAEditar = turno({ id: 't-editar' });
      const resultado: DiaTurnosResultado = { cambios: false, accion: 'editar', turno: turnoAEditar };
      dialog.open.and.returnValues(
        { afterClosed: () => of(resultado) } as never,
        { afterClosed: () => of(undefined) } as never
      );

      component.onDiaClick('2026-08-10');

      expect(dialog.open.calls.argsFor(1)).toEqual([TurnoFormComponent, { width: '420px', data: { turno: turnoAEditar } }]);
    });

    it('cambios sin accion (p.ej. turno eliminado) recarga los turnos sin abrir un formulario', async () => {
      crear({ turnos: [turno({ id: 't1' })] });
      await component.onMesCambiado(RANGO);
      turnosService.listarPorRango.calls.reset();
      const resultado: DiaTurnosResultado = { cambios: true };
      dialog.open.and.returnValue({ afterClosed: () => of(resultado) } as never);

      component.onDiaClick('2026-08-10');
      await fixture.whenStable();

      expect(dialog.open).toHaveBeenCalledTimes(1);
      expect(turnosService.listarPorRango).toHaveBeenCalledWith('2026-08-01', '2026-08-31');
    });
  });
});
