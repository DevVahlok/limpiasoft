import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ResponsiveService } from '../../core/layout/responsive.service';
import { Turno } from '../../core/turnos/turno.models';
import { CalendarioMesComponent, RangoMes } from './calendario-mes.component';

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

describe('CalendarioMesComponent', () => {
  let fixture: ComponentFixture<CalendarioMesComponent>;
  let component: CalendarioMesComponent;
  let isHandset: boolean;

  function crear() {
    isHandset = false;
    TestBed.configureTestingModule({
      imports: [CalendarioMesComponent],
      providers: [provideNoopAnimations(), { provide: ResponsiveService, useValue: { isHandset: () => isHandset } }],
    });
    fixture = TestBed.createComponent(CalendarioMesComponent);
    component = fixture.componentInstance;
  }

  describe('nombreDiaSemana', () => {
    it('mapea los días de la semana empezando en lunes', () => {
      crear();
      // 2026-08-03 es lunes (agosto de 2026 empieza en sábado).
      expect(component.nombreDiaSemana(new Date(2026, 7, 3))).toBe('Lun');
      expect(component.nombreDiaSemana(new Date(2026, 7, 4))).toBe('Mar');
      expect(component.nombreDiaSemana(new Date(2026, 7, 9))).toBe('Dom');
    });
  });

  describe('etiquetaChip', () => {
    it('muestra el nombre del empleado cuando mostrarEmpleado es true (vista jefe)', () => {
      crear();
      component.mostrarEmpleado = true;
      expect(component.etiquetaChip(turno({}))).toBe('Ana Gómez');
    });

    it('muestra el puesto y el horario cuando mostrarEmpleado es false (vista empleado)', () => {
      crear();
      component.mostrarEmpleado = false;
      expect(component.etiquetaChip(turno({ hora_inicio: '09:00', hora_fin: '17:00' }))).toBe('Oficina Centro · 09:00-17:00');
    });

    it('usa "—" cuando falta el dato correspondiente', () => {
      crear();
      component.mostrarEmpleado = true;
      expect(component.etiquetaChip(turno({ empleado: null }))).toBe('—');
    });
  });

  describe('construcción de la cuadrícula', () => {
    beforeEach(() => {
      crear();
      component.ngOnInit(); // usa el mes real actual; solo se verifican invariantes estructurales
    });

    it('genera siempre 6 semanas de 7 días, empezando en lunes', () => {
      expect(component.semanas.length).toBe(6);
      component.semanas.forEach((semana) => expect(semana.length).toBe(7));
      expect(component.semanas[0][0].fecha.getDay()).toBe(1); // lunes
    });

    it('la última celda de la cuadrícula es siempre un domingo', () => {
      const ultimaSemana = component.semanas[component.semanas.length - 1];
      expect(ultimaSemana[6].fecha.getDay()).toBe(0); // domingo
    });

    it('diasAgenda contiene únicamente los días del mes actualmente mostrado', () => {
      const mesEsperado = component.diasAgenda[0].fecha.getMonth();
      expect(component.diasAgenda.every((d) => d.enMesActual)).toBe(true);
      expect(component.diasAgenda.every((d) => d.fecha.getMonth() === mesEsperado)).toBe(true);
    });

    it('marca esHoy en la celda correspondiente a la fecha actual', () => {
      const hoyIso = (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })();
      const celdaHoy = component.semanas.flat().find((d) => d.iso === hoyIso);
      expect(celdaHoy?.esHoy).toBe(true);
    });

    it('agrupa en cada celda los turnos que corresponden a su fecha', () => {
      const primerDiaDelMes = component.diasAgenda[0];
      component.turnos = [turno({ fecha: primerDiaDelMes.iso })];

      component.ngOnChanges();

      const celda = component.diasAgenda.find((d) => d.iso === primerDiaDelMes.iso)!;
      expect(celda.turnos.length).toBe(1);
      const otraCelda = component.diasAgenda.find((d) => d.iso !== primerDiaDelMes.iso)!;
      expect(otraCelda.turnos.length).toBe(0);
    });
  });

  describe('navegación de mes', () => {
    it('irMesAnterior retrocede un mes y emite mesCambiado', () => {
      crear();
      component.ngOnInit();
      const mesInicial = component.etiquetaMes;
      const emitSpy = spyOn(component.mesCambiado, 'emit');

      component.irMesAnterior();

      expect(component.etiquetaMes).not.toBe(mesInicial);
      expect(emitSpy).toHaveBeenCalled();
    });

    it('irMesSiguiente avanza un mes y emite mesCambiado', () => {
      crear();
      component.ngOnInit();
      const mesInicial = component.etiquetaMes;
      const emitSpy = spyOn(component.mesCambiado, 'emit');

      component.irMesSiguiente();

      expect(component.etiquetaMes).not.toBe(mesInicial);
      expect(emitSpy).toHaveBeenCalled();
    });

    it('irMesAnterior seguido de irMesSiguiente vuelve al mes original', () => {
      crear();
      component.ngOnInit();
      const mesInicial = component.etiquetaMes;

      component.irMesAnterior();
      component.irMesSiguiente();

      expect(component.etiquetaMes).toBe(mesInicial);
    });

    it('irHoy vuelve al mes actual y emite mesCambiado', () => {
      crear();
      component.ngOnInit();
      component.irMesAnterior();
      const emitSpy = spyOn(component.mesCambiado, 'emit');

      component.irHoy();

      expect(component.etiquetaMes).toContain(String(new Date().getFullYear()));
      expect(emitSpy).toHaveBeenCalled();
    });

    it('el rango emitido cubre exactamente el primer y el último día de la cuadrícula visible', () => {
      crear();
      const emitido: RangoMes[] = [];
      component.mesCambiado.subscribe((r) => emitido.push(r));

      component.ngOnInit();

      const [rango] = emitido;
      const ultimaSemana = component.semanas[component.semanas.length - 1];
      expect(rango.desde).toBe(component.semanas[0][0].iso);
      expect(rango.hasta).toBe(ultimaSemana[6].iso);
    });
  });

  describe('vista responsive', () => {
    it('en escritorio muestra la cuadrícula semanal y no la lista tipo agenda', () => {
      crear();
      fixture.detectChanges();

      const celdas = fixture.nativeElement.querySelectorAll('.celda-dia');
      const agenda = fixture.nativeElement.querySelectorAll('.agenda-dia');
      expect(celdas.length).toBe(42);
      expect(agenda.length).toBe(0);
    });

    it('en móvil muestra la lista tipo agenda y no la cuadrícula', () => {
      crear();
      isHandset = true;
      fixture.detectChanges();

      const celdas = fixture.nativeElement.querySelectorAll('.celda-dia');
      const agenda = fixture.nativeElement.querySelectorAll('.agenda-dia');
      expect(celdas.length).toBe(0);
      expect(agenda.length).toBe(component.diasAgenda.length);
    });

    it('al hacer click en una celda de la cuadrícula se emite diaClick con su fecha ISO', () => {
      crear();
      fixture.detectChanges();
      const emitSpy = spyOn(component.diaClick, 'emit');

      const primeraCelda: HTMLButtonElement = fixture.nativeElement.querySelector('.celda-dia');
      primeraCelda.click();

      expect(emitSpy).toHaveBeenCalledWith(component.semanas[0][0].iso);
    });
  });
});
