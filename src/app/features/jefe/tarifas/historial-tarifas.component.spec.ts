import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { Tarifa } from '../../../core/tarifas/tarifa.models';
import { HistorialTarifasComponent, HistorialTarifasData } from './historial-tarifas.component';

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

describe('HistorialTarifasComponent', () => {
  let fixture: ComponentFixture<HistorialTarifasComponent>;
  let component: HistorialTarifasComponent;

  function crear(data: HistorialTarifasData) {
    TestBed.configureTestingModule({
      imports: [HistorialTarifasComponent],
      providers: [provideNoopAnimations(), { provide: MAT_DIALOG_DATA, useValue: data }],
    });
    fixture = TestBed.createComponent(HistorialTarifasComponent);
    component = fixture.componentInstance;
  }

  it('expone los datos inyectados', () => {
    const data: HistorialTarifasData = { empleadoNombre: 'Ana Gómez', tarifas: [tarifa({})] };
    crear(data);
    expect(component.data).toBe(data);
  });

  it('muestra el nombre del empleado en el título', () => {
    crear({ empleadoNombre: 'Ana Gómez', tarifas: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2').textContent).toContain('Ana Gómez');
  });

  it('sin tarifas, muestra el mensaje de vacío', () => {
    crear({ empleadoNombre: 'Ana', tarifas: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.vacio').textContent).toContain('Sin tarifas registradas.');
  });

  it('marca "Actual" solo la primera tarifa (la más reciente)', () => {
    crear({
      empleadoNombre: 'Ana',
      tarifas: [tarifa({ id: 'reciente', tarifa_hora: 12, vigente_desde: '2026-07-01' }), tarifa({ id: 'antigua', tarifa_hora: 9, vigente_desde: '2026-01-01' })],
    });
    fixture.detectChanges();

    const filas = fixture.nativeElement.querySelectorAll('.fila');
    expect(filas.length).toBe(2);
    expect(filas[0].querySelector('.etiqueta-actual')).not.toBeNull();
    expect(filas[1].querySelector('.etiqueta-actual')).toBeNull();
  });
});
