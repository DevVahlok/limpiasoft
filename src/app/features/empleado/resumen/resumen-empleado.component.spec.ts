import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { Tarifa } from '../../../core/tarifas/tarifa.models';
import { TarifasService } from '../../../core/tarifas/tarifas.service';
import { Turno } from '../../../core/turnos/turno.models';
import { TurnosService } from '../../../core/turnos/turnos.service';
import { ResumenEmpleadoComponent } from './resumen-empleado.component';

function turno(overrides: Partial<Turno>): Turno {
  return {
    id: 't1',
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
    id: 'tf1',
    empresa_id: 'empresa-1',
    empleado_id: 'e1',
    tarifa_hora: 10,
    vigente_desde: '2026-01-01',
    created_at: '2026-01-01',
    empleado: null,
    ...overrides,
  };
}

describe('ResumenEmpleadoComponent', () => {
  let fixture: ComponentFixture<ResumenEmpleadoComponent>;
  let component: ResumenEmpleadoComponent;
  let turnosService: jasmine.SpyObj<TurnosService>;
  let tarifasService: jasmine.SpyObj<TarifasService>;

  function crear(datos: { turnos: Turno[]; tarifas: Tarifa[] }) {
    turnosService = jasmine.createSpyObj('TurnosService', ['listarPorRango']);
    tarifasService = jasmine.createSpyObj('TarifasService', ['listar']);
    turnosService.listarPorRango.and.resolveTo(datos.turnos);
    tarifasService.listar.and.resolveTo(datos.tarifas);

    TestBed.configureTestingModule({
      imports: [ResumenEmpleadoComponent],
      providers: [
        provideNoopAnimations(),
        { provide: TurnosService, useValue: turnosService },
        { provide: TarifasService, useValue: tarifasService },
      ],
    });
    fixture = TestBed.createComponent(ResumenEmpleadoComponent);
    component = fixture.componentInstance;
  }

  it('horasPlanificadas cuenta todos los turnos del mes salvo los cancelados (completados y programados)', async () => {
    crear({
      turnos: [
        turno({ id: 't1', estado: 'completado', hora_inicio: '09:00', hora_fin: '17:00' }), // 8h
        turno({ id: 't2', estado: 'programado', hora_inicio: '09:00', hora_fin: '13:00' }), // 4h
        turno({ id: 't3', estado: 'cancelado', hora_inicio: '09:00', hora_fin: '13:00' }), // no cuenta
      ],
      tarifas: [tarifa({ tarifa_hora: 10 })],
    });

    await component.ngOnInit();

    expect(component.horasPlanificadas()).toBe(12); // 8 + 4, el cancelado no cuenta
  });

  it('horasCompletadas solo cuenta los turnos en estado completado', async () => {
    crear({
      turnos: [
        turno({ id: 't1', estado: 'completado', hora_inicio: '09:00', hora_fin: '17:00' }), // 8h
        turno({ id: 't2', estado: 'programado', hora_inicio: '09:00', hora_fin: '13:00' }), // 4h
      ],
      tarifas: [tarifa({ tarifa_hora: 10 })],
    });

    await component.ngOnInit();

    expect(component.horasCompletadas()).toBe(8);
  });

  it('totalACobrar solo suma el importe de los turnos completados, con la tarifa vigente', async () => {
    crear({
      turnos: [
        turno({ id: 't1', estado: 'completado', hora_inicio: '09:00', hora_fin: '17:00' }), // 8h
        turno({ id: 't2', estado: 'programado', hora_inicio: '09:00', hora_fin: '13:00' }), // 4h, aún no cuenta
      ],
      tarifas: [tarifa({ tarifa_hora: 10 })],
    });

    await component.ngOnInit();

    expect(component.totalACobrar()).toBe(80); // 8h * 10€
  });

  it('previsionMes suma completados y programados con su tarifa, pero no los cancelados', async () => {
    crear({
      turnos: [
        turno({ id: 't1', estado: 'completado', hora_inicio: '09:00', hora_fin: '17:00' }), // 8h
        turno({ id: 't2', estado: 'programado', hora_inicio: '09:00', hora_fin: '13:00' }), // 4h
        turno({ id: 't3', estado: 'cancelado', hora_inicio: '09:00', hora_fin: '13:00' }), // no cuenta
      ],
      tarifas: [tarifa({ tarifa_hora: 10 })],
    });

    await component.ngOnInit();

    expect(component.previsionMes()).toBe(120); // (8 + 4) * 10€
  });

  it('usa la tarifa vigente en la fecha del turno, no la más reciente', async () => {
    crear({
      turnos: [turno({ fecha: '2026-06-15', estado: 'completado', hora_inicio: '09:00', hora_fin: '17:00' })], // 8h en junio
      tarifas: [
        tarifa({ id: 'tf-reciente', tarifa_hora: 12, vigente_desde: '2026-07-01' }),
        tarifa({ id: 'tf-junio', tarifa_hora: 9, vigente_desde: '2026-01-01' }),
      ],
    });

    await component.ngOnInit();

    expect(component.totalACobrar()).toBe(72); // 8h * 9€ (vigente en junio), no 8h * 12€
  });

  it('un turno completado sin tarifa vigente en su fecha no aporta importe', async () => {
    crear({
      turnos: [turno({ fecha: '2026-01-01', estado: 'completado', hora_inicio: '09:00', hora_fin: '17:00' })],
      tarifas: [tarifa({ vigente_desde: '2026-06-01' })], // la tarifa empieza después del turno
    });

    await component.ngOnInit();

    expect(component.totalACobrar()).toBe(0);
  });

  describe('importe()', () => {
    it('devuelve null para un turno que no está completado', () => {
      crear({ turnos: [], tarifas: [tarifa({ tarifa_hora: 10 })] });
      expect(component.importe(turno({ estado: 'programado' }))).toBeNull();
    });

    it('devuelve el importe calculado para un turno completado con tarifa vigente', async () => {
      crear({ turnos: [], tarifas: [tarifa({ tarifa_hora: 10, vigente_desde: '2026-01-01' })] });
      await component.ngOnInit();

      expect(component.importe(turno({ estado: 'completado', hora_inicio: '09:00', hora_fin: '17:00' }))).toBe(80);
    });
  });

  describe('horas()', () => {
    it('calcula las horas transcurridas entre hora_inicio y hora_fin', () => {
      crear({ turnos: [], tarifas: [] });
      expect(component.horas(turno({ hora_inicio: '09:00', hora_fin: '13:30' }))).toBe(4.5);
    });
  });

  it('onMesChange cambia el mes activo y recarga los turnos de ese mes', async () => {
    crear({ turnos: [], tarifas: [] });
    await component.ngOnInit();
    turnosService.listarPorRango.calls.reset();

    await component.onMesChange('2026-09');

    expect(component.mes).toBe('2026-09');
    expect(turnosService.listarPorRango).toHaveBeenCalledWith('2026-09-01', '2026-09-30');
  });

  it('loading se activa durante la carga y se desactiva al terminar', async () => {
    crear({ turnos: [], tarifas: [] });

    const promesa = component.ngOnInit();
    expect(component.loading()).toBe(true);
    await promesa;

    expect(component.loading()).toBe(false);
  });
});
