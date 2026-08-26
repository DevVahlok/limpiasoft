import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { Profile } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { ResponsiveService } from '../../../core/layout/responsive.service';
import { Tarifa } from '../../../core/tarifas/tarifa.models';
import { TarifasService } from '../../../core/tarifas/tarifas.service';
import { EmpleadosService } from '../empleados/empleados.service';
import { HistorialTarifasComponent } from './historial-tarifas.component';
import { TarifaFormComponent } from './tarifa-form.component';
import { TarifasListComponent } from './tarifas-list.component';

function empleado(id: string, nombre: string): Profile {
  return { id, nombre_completo: nombre } as Profile;
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

describe('TarifasListComponent', () => {
  let fixture: ComponentFixture<TarifasListComponent>;
  let component: TarifasListComponent;
  let empleadosService: jasmine.SpyObj<EmpleadosService>;
  let tarifasService: jasmine.SpyObj<TarifasService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let empresaPausada: ReturnType<typeof signal<boolean>>;
  let isHandset: ReturnType<typeof signal<boolean>>;

  function crear(datos: { empleados?: Profile[]; tarifas?: Tarifa[] } = {}) {
    empleadosService = jasmine.createSpyObj('EmpleadosService', ['listar']);
    tarifasService = jasmine.createSpyObj('TarifasService', ['listar']);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    empresaPausada = signal(false);
    isHandset = signal(false);

    empleadosService.listar.and.resolveTo(datos.empleados ?? []);
    tarifasService.listar.and.resolveTo(datos.tarifas ?? []);

    TestBed.configureTestingModule({
      imports: [TarifasListComponent],
      providers: [
        provideNoopAnimations(),
        { provide: EmpleadosService, useValue: empleadosService },
        { provide: TarifasService, useValue: tarifasService },
        { provide: MatDialog, useValue: dialog },
        { provide: AuthService, useValue: { empresaPausada } },
        { provide: ResponsiveService, useValue: { isHandset } },
      ],
    });
    TestBed.overrideComponent(TarifasListComponent, {
      add: { providers: [{ provide: MatDialog, useValue: dialog }] },
    });
    fixture = TestBed.createComponent(TarifasListComponent);
    component = fixture.componentInstance;
  }

  describe('cargar', () => {
    it('agrupa el historial de tarifas por empleado y toma la primera como la actual', async () => {
      crear({
        empleados: [empleado('e1', 'Ana Gómez')],
        tarifas: [
          tarifa({ id: 'reciente', empleado_id: 'e1', tarifa_hora: 12, vigente_desde: '2026-07-01' }),
          tarifa({ id: 'antigua', empleado_id: 'e1', tarifa_hora: 9, vigente_desde: '2026-01-01' }),
        ],
      });
      await component.cargar();

      const [fila] = component.filas();
      expect(fila.actual?.id).toBe('reciente');
      expect(fila.historial.map((t) => t.id)).toEqual(['reciente', 'antigua']);
      expect(component.loading()).toBe(false);
    });

    it('un empleado sin tarifas tiene actual null e historial vacío', async () => {
      crear({ empleados: [empleado('e1', 'Ana Gómez')], tarifas: [] });
      await component.cargar();

      const [fila] = component.filas();
      expect(fila.actual).toBeNull();
      expect(fila.historial).toEqual([]);
    });
  });

  describe('abrirNuevaTarifa', () => {
    it('abre TarifaFormComponent con el empleado de la fila', async () => {
      crear({ empleados: [empleado('e1', 'Ana Gómez')], tarifas: [] });
      await component.cargar();
      dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);

      component.abrirNuevaTarifa(component.filas()[0]);

      expect(dialog.open).toHaveBeenCalledWith(TarifaFormComponent, {
        width: '380px',
        data: { empleadoId: 'e1', empleadoNombre: 'Ana Gómez' },
      });
    });

    it('si se guarda, recarga la lista', async () => {
      crear({ empleados: [empleado('e1', 'Ana Gómez')], tarifas: [] });
      await component.cargar();
      empleadosService.listar.calls.reset();
      dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);

      component.abrirNuevaTarifa(component.filas()[0]);
      await fixture.whenStable();

      expect(empleadosService.listar).toHaveBeenCalled();
    });
  });

  it('abrirHistorial abre HistorialTarifasComponent con el historial de la fila', async () => {
    crear({
      empleados: [empleado('e1', 'Ana Gómez')],
      tarifas: [tarifa({ id: 'tf1', empleado_id: 'e1' })],
    });
    await component.cargar();
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as never);

    component.abrirHistorial(component.filas()[0]);

    expect(dialog.open).toHaveBeenCalledWith(HistorialTarifasComponent, {
      width: '400px',
      data: { empleadoNombre: 'Ana Gómez', tarifas: [tarifa({ id: 'tf1', empleado_id: 'e1' })] },
    });
  });

  describe('empresa pausada', () => {
    it('oculta el botón de cambiar tarifa pero conserva el de ver historial', async () => {
      crear({ empleados: [empleado('e1', 'Ana Gómez')], tarifas: [tarifa({ empleado_id: 'e1' })] });
      empresaPausada.set(true);
      // El primer detectChanges() dispara ngOnInit(), que ya llama a cargar() por su cuenta;
      // no hace falta (ni conviene) invocarlo también a mano, o la carga manual se pisa con la de ngOnInit.
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const botones = fixture.nativeElement.querySelectorAll('td.acciones button');
      expect(botones.length).toBe(1);
      expect(botones[0].getAttribute('aria-label')).toBe('Ver historial');
    });

    it('muestra ambos botones cuando la empresa no está pausada', async () => {
      crear({ empleados: [empleado('e1', 'Ana Gómez')], tarifas: [tarifa({ empleado_id: 'e1' })] });
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const botones = fixture.nativeElement.querySelectorAll('td.acciones button');
      expect(botones.length).toBe(2);
    });
  });

  describe('vista móvil (tarjetas) vs escritorio (tabla)', () => {
    it('en móvil, muestra tarjetas en lugar de la tabla', async () => {
      crear({ empleados: [empleado('e1', 'Ana Gómez')], tarifas: [] });
      isHandset.set(true);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.tarjetas-tabla')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('table')).toBeNull();
    });

    it('en escritorio, muestra la tabla', async () => {
      crear({ empleados: [empleado('e1', 'Ana Gómez')], tarifas: [] });
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('table')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.tarjetas-tabla')).toBeNull();
    });
  });
});
