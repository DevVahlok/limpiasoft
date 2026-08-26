import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { Profile } from '../../../core/auth/auth.models';
import { PagosNominaService } from '../../../core/nomina/pagos-nomina.service';
import { Tarifa } from '../../../core/tarifas/tarifa.models';
import { TarifasService } from '../../../core/tarifas/tarifas.service';
import { Turno } from '../../../core/turnos/turno.models';
import { TurnosService } from '../../../core/turnos/turnos.service';
import { EmpleadosService } from '../empleados/empleados.service';
import { ResumenMensualComponent } from './resumen-mensual.component';

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
    estado: 'completado',
    notas: null,
    empleado: null,
    puesto: null,
    ...overrides,
  };
}

function tarifa(overrides: Partial<Tarifa>): Tarifa {
  return {
    id: 'tarifa-1',
    empresa_id: 'empresa-1',
    empleado_id: 'e1',
    tarifa_hora: 10,
    vigente_desde: '2026-01-01',
    created_at: '2026-01-01',
    empleado: null,
    ...overrides,
  };
}

describe('ResumenMensualComponent', () => {
  let fixture: ComponentFixture<ResumenMensualComponent>;
  let component: ResumenMensualComponent;
  let empleadosService: jasmine.SpyObj<EmpleadosService>;
  let turnosService: jasmine.SpyObj<TurnosService>;
  let tarifasService: jasmine.SpyObj<TarifasService>;
  let pagosNominaService: jasmine.SpyObj<PagosNominaService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  function crear(datos: { empleados: Profile[]; turnos: Turno[]; tarifas: Tarifa[]; pagos?: { id: string; empleado_id: string }[] }) {
    empleadosService = jasmine.createSpyObj('EmpleadosService', ['listar']);
    turnosService = jasmine.createSpyObj('TurnosService', ['listarPorRango']);
    tarifasService = jasmine.createSpyObj('TarifasService', ['listar']);
    pagosNominaService = jasmine.createSpyObj('PagosNominaService', ['listarPorMes', 'marcarPagado', 'desmarcarPagado']);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    empleadosService.listar.and.resolveTo(datos.empleados);
    turnosService.listarPorRango.and.resolveTo(datos.turnos);
    tarifasService.listar.and.resolveTo(datos.tarifas);
    pagosNominaService.listarPorMes.and.resolveTo((datos.pagos ?? []) as never);

    TestBed.configureTestingModule({
      imports: [ResumenMensualComponent],
      providers: [
        provideNoopAnimations(),
        { provide: EmpleadosService, useValue: empleadosService },
        { provide: TurnosService, useValue: turnosService },
        { provide: TarifasService, useValue: tarifasService },
        { provide: PagosNominaService, useValue: pagosNominaService },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: AuthService, useValue: { profile: () => ({ empresa_id: 'empresa-1' }) } },
      ],
    });
    // MatDialogModule y MatSnackBarModule (importados por el propio componente)
    // declaran MatDialog/MatSnackBar con `providedIn: SuPropioModule` en vez de
    // 'root', así que el import del propio componente crea una instancia real
    // que tapa el override de arriba; hay que sobreescribirlo también a nivel
    // del propio componente para que gane sobre ese import.
    TestBed.overrideComponent(ResumenMensualComponent, {
      add: { providers: [{ provide: MatDialog, useValue: dialog }, { provide: MatSnackBar, useValue: snackBar }] },
    });
    fixture = TestBed.createComponent(ResumenMensualComponent);
    component = fixture.componentInstance;
  }

  it('calcula horas e importe solo con los turnos completados', async () => {
    crear({
      empleados: [empleado('e1', 'Ana Gómez')],
      turnos: [
        turno({ id: 't1', estado: 'completado', hora_inicio: '09:00', hora_fin: '17:00' }), // 8h
        turno({ id: 't2', estado: 'programado', hora_inicio: '09:00', hora_fin: '13:00' }), // 4h, no cuenta como trabajado
      ],
      tarifas: [tarifa({ tarifa_hora: 10, vigente_desde: '2026-01-01' })],
    });
    await component.ngOnInit();

    const [fila] = component.filas();
    expect(fila.horas).toBe(8);
    expect(fila.importe).toBe(80);
  });

  it('la previsión incluye los turnos programados pero no los cancelados', async () => {
    crear({
      empleados: [empleado('e1', 'Ana Gómez')],
      turnos: [
        turno({ id: 't1', estado: 'completado', hora_inicio: '09:00', hora_fin: '17:00' }), // 8h
        turno({ id: 't2', estado: 'programado', hora_inicio: '09:00', hora_fin: '13:00' }), // 4h
        turno({ id: 't3', estado: 'cancelado', hora_inicio: '09:00', hora_fin: '13:00' }), // no cuenta
      ],
      tarifas: [tarifa({ tarifa_hora: 10, vigente_desde: '2026-01-01' })],
    });
    await component.ngOnInit();

    const [fila] = component.filas();
    expect(fila.previsionImporte).toBe(120); // (8 + 4) * 10
  });

  it('usa la tarifa vigente en la fecha del turno, no la tarifa actual', async () => {
    crear({
      empleados: [empleado('e1', 'Ana Gómez')],
      turnos: [turno({ fecha: '2026-06-15', hora_inicio: '09:00', hora_fin: '17:00' })], // 8h en junio
      tarifas: [
        // Ordenadas de más reciente a más antigua, como las devuelve TarifasService.listar().
        tarifa({ id: 'tf-reciente', tarifa_hora: 12, vigente_desde: '2026-07-01' }),
        tarifa({ id: 'tf-junio', tarifa_hora: 9, vigente_desde: '2026-01-01' }),
      ],
    });
    await component.ngOnInit();

    const [fila] = component.filas();
    expect(fila.importe).toBe(72); // 8h * 9€ (la tarifa vigente en junio), no 8h * 12€
  });

  it('un turno sin tarifa vigente en su fecha no aporta importe', async () => {
    crear({
      empleados: [empleado('e1', 'Ana Gómez')],
      turnos: [turno({ fecha: '2026-01-01', hora_inicio: '09:00', hora_fin: '17:00' })],
      tarifas: [tarifa({ vigente_desde: '2026-06-01' })], // la tarifa empieza después del turno
    });
    await component.ngOnInit();

    const [fila] = component.filas();
    expect(fila.horas).toBe(8);
    expect(fila.importe).toBe(0);
  });

  it('totalImporte y totalPrevision suman las filas de todos los empleados', async () => {
    crear({
      empleados: [empleado('e1', 'Ana Gómez'), empleado('e2', 'Luis Ruiz')],
      turnos: [
        turno({ id: 't1', empleado_id: 'e1', hora_inicio: '09:00', hora_fin: '17:00' }), // 8h
        turno({ id: 't2', empleado_id: 'e2', hora_inicio: '09:00', hora_fin: '13:00' }), // 4h
      ],
      tarifas: [tarifa({ empleado_id: 'e1', tarifa_hora: 10 }), tarifa({ id: 'tf-e2', empleado_id: 'e2', tarifa_hora: 10 })],
    });
    await component.ngOnInit();

    expect(component.totalImporte()).toBe(120); // 80 + 40
  });

  it('asocia el pagoId de pagos_nomina al empleado correspondiente', async () => {
    crear({
      empleados: [empleado('e1', 'Ana Gómez')],
      turnos: [],
      tarifas: [],
      pagos: [{ id: 'pago-1', empleado_id: 'e1' }],
    });
    await component.ngOnInit();

    expect(component.filas()[0].pagoId).toBe('pago-1');
  });

  describe('marcarPagado', () => {
    it('actualiza el pagoId de la fila tras marcar como pagado', async () => {
      crear({ empleados: [empleado('e1', 'Ana Gómez')], turnos: [], tarifas: [] });
      await component.ngOnInit();
      pagosNominaService.marcarPagado.and.resolveTo({ id: 'pago-nuevo', empresa_id: 'empresa-1', empleado_id: 'e1', mes: '2026-08-01' });

      await component.marcarPagado(component.filas()[0]);

      expect(pagosNominaService.marcarPagado).toHaveBeenCalledWith('empresa-1', 'e1', component.mes);
      expect(component.filas()[0].pagoId).toBe('pago-nuevo');
    });

    it('muestra un snackbar si falla al marcar como pagado', async () => {
      crear({ empleados: [empleado('e1', 'Ana Gómez')], turnos: [], tarifas: [] });
      await component.ngOnInit();
      pagosNominaService.marcarPagado.and.callFake(() => Promise.reject(new Error('ya estaba pagado')));

      await component.marcarPagado(component.filas()[0]);

      expect(snackBar.open).toHaveBeenCalledWith('ya estaba pagado', 'Cerrar', { duration: 5000 });
    });
  });

  describe('desmarcarPagado', () => {
    it('no hace nada si la fila no tiene pagoId', () => {
      crear({ empleados: [], turnos: [], tarifas: [] });
      component.desmarcarPagado({ empleado: empleado('e1', 'Ana'), horas: 0, importe: 0, previsionImporte: 0, detalle: [], pagoId: null });
      expect(dialog.open).not.toHaveBeenCalled();
    });

    it('pide confirmación y, al confirmar, borra el pago y limpia el pagoId de la fila', async () => {
      crear({
        empleados: [empleado('e1', 'Ana Gómez')],
        turnos: [],
        tarifas: [],
        pagos: [{ id: 'pago-1', empleado_id: 'e1' }],
      });
      await component.ngOnInit();
      dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);

      component.desmarcarPagado(component.filas()[0]);
      await fixture.whenStable();

      expect(pagosNominaService.desmarcarPagado).toHaveBeenCalledWith('pago-1');
      expect(component.filas()[0].pagoId).toBeNull();
    });

    it('no borra el pago si se cancela la confirmación', async () => {
      crear({
        empleados: [empleado('e1', 'Ana Gómez')],
        turnos: [],
        tarifas: [],
        pagos: [{ id: 'pago-1', empleado_id: 'e1' }],
      });
      await component.ngOnInit();
      dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);

      component.desmarcarPagado(component.filas()[0]);
      await fixture.whenStable();

      expect(pagosNominaService.desmarcarPagado).not.toHaveBeenCalled();
      expect(component.filas()[0].pagoId).toBe('pago-1');
    });
  });
});
