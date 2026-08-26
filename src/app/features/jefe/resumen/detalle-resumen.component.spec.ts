import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ResponsiveService } from '../../../core/layout/responsive.service';
import { Turno } from '../../../core/turnos/turno.models';
import { DetalleResumenComponent, DetalleResumenData } from './detalle-resumen.component';
import { DetalleTurno } from './resumen-mensual.component';

function turno(overrides: Partial<Turno>): Turno {
  return {
    id: 't1',
    empresa_id: 'empresa-1',
    empleado_id: 'e1',
    puesto_id: 'p1',
    fecha: '2026-08-10',
    hora_inicio: '09:00:00',
    hora_fin: '17:00:00',
    estado: 'completado',
    notas: null,
    empleado: null,
    puesto: { nombre: 'Oficina' },
    ...overrides,
  };
}

function detalle(overrides: Partial<DetalleTurno> = {}): DetalleTurno {
  return { turno: turno({}), horas: 8, tarifaHora: 10, importe: 80, ...overrides };
}

describe('DetalleResumenComponent', () => {
  let fixture: ComponentFixture<DetalleResumenComponent>;
  let component: DetalleResumenComponent;
  let isHandset: ReturnType<typeof signal<boolean>>;

  function crear(data: DetalleResumenData) {
    isHandset = signal(false);

    TestBed.configureTestingModule({
      imports: [DetalleResumenComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: ResponsiveService, useValue: { isHandset } },
      ],
    });
    fixture = TestBed.createComponent(DetalleResumenComponent);
    component = fixture.componentInstance;
  }

  it('expone los datos inyectados', () => {
    const data: DetalleResumenData = { empleadoNombre: 'Ana Gómez', detalle: [detalle({})] };
    crear(data);
    expect(component.data).toBe(data);
  });

  it('define las columnas de la tabla', () => {
    crear({ empleadoNombre: 'Ana', detalle: [] });
    expect(component.columnas).toEqual(['fecha', 'puesto', 'horario', 'horas', 'tarifa', 'importe']);
  });

  it('muestra el nombre del empleado en el título', () => {
    crear({ empleadoNombre: 'Ana Gómez', detalle: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2').textContent).toContain('Ana Gómez');
  });

  it('sin turnos, muestra el mensaje de vacío', () => {
    crear({ empleadoNombre: 'Ana', detalle: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.vacio').textContent).toContain('Sin turnos completados este mes.');
  });

  it('un turno sin tarifa vigente muestra "sin tarifa"', () => {
    crear({ empleadoNombre: 'Ana', detalle: [detalle({ tarifaHora: null, importe: 0 })] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('sin tarifa');
  });

  describe('vista móvil (tarjetas) vs escritorio (tabla)', () => {
    it('en móvil, muestra tarjetas en lugar de la tabla', () => {
      crear({ empleadoNombre: 'Ana', detalle: [detalle({})] });
      isHandset.set(true);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.tarjetas-tabla')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('table')).toBeNull();
    });

    it('en escritorio, muestra la tabla', () => {
      crear({ empleadoNombre: 'Ana', detalle: [detalle({})] });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('table')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.tarjetas-tabla')).toBeNull();
    });
  });
});
