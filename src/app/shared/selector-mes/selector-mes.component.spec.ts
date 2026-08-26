import { ComponentFixture, TestBed } from '@angular/core/testing';

import { mesActualIso } from '../../core/turnos/fecha.util';
import { SelectorMesComponent } from './selector-mes.component';

describe('SelectorMesComponent', () => {
  let fixture: ComponentFixture<SelectorMesComponent>;
  let component: SelectorMesComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SelectorMesComponent] });
    fixture = TestBed.createComponent(SelectorMesComponent);
    component = fixture.componentInstance;
  });

  it('usa el mes actual como valor por defecto', () => {
    expect(component.mes).toBe(mesActualIso());
  });

  it('ngOnInit calcula la etiqueta a partir del mes recibido', () => {
    component.mes = '2026-03';
    component.ngOnInit();
    expect(component.etiqueta).toBe('marzo 2026');
  });

  it('ngOnChanges recalcula la etiqueta cuando cambia el mes', () => {
    component.mes = '2026-05';
    component.ngOnChanges();
    expect(component.etiqueta).toBe('mayo 2026');
  });

  describe('irMesAnterior', () => {
    it('retrocede un mes dentro del mismo año y emite mesChange', () => {
      component.mes = '2026-08';
      const emitido: string[] = [];
      component.mesChange.subscribe((m) => emitido.push(m));

      component.irMesAnterior();

      expect(component.mes).toBe('2026-07');
      expect(component.etiqueta).toBe('julio 2026');
      expect(emitido).toEqual(['2026-07']);
    });

    it('retrocede de enero a diciembre del año anterior', () => {
      component.mes = '2026-01';

      component.irMesAnterior();

      expect(component.mes).toBe('2025-12');
      expect(component.etiqueta).toBe('diciembre 2025');
    });
  });

  describe('irMesSiguiente', () => {
    it('avanza un mes dentro del mismo año y emite mesChange', () => {
      component.mes = '2026-08';
      const emitido: string[] = [];
      component.mesChange.subscribe((m) => emitido.push(m));

      component.irMesSiguiente();

      expect(component.mes).toBe('2026-09');
      expect(emitido).toEqual(['2026-09']);
    });

    it('avanza de diciembre a enero del año siguiente', () => {
      component.mes = '2026-12';

      component.irMesSiguiente();

      expect(component.mes).toBe('2027-01');
      expect(component.etiqueta).toBe('enero 2027');
    });
  });

  describe('irHoy', () => {
    it('si ya está en el mes actual, no emite mesChange', () => {
      component.mes = mesActualIso();
      const emitSpy = spyOn(component.mesChange, 'emit');

      component.irHoy();

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('si no está en el mes actual, cambia al mes actual y emite mesChange', () => {
      component.mes = '2020-01';

      component.irHoy();

      expect(component.mes).toBe(mesActualIso());
      expect(component.etiqueta).toContain(String(new Date().getFullYear()));
    });
  });
});
