import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { AuthService } from '../../../core/auth/auth.service';
import { Incidencia } from '../../../core/incidencias/incidencia.models';
import { IncidenciasService } from '../../../core/incidencias/incidencias.service';
import { ResponsiveService } from '../../../core/layout/responsive.service';
import { mesActualIso } from '../../../core/turnos/fecha.util';
import { IncidenciasJefeComponent } from './incidencias-jefe.component';

const MES_ACTUAL = mesActualIso();

function incidencia(overrides: Partial<Incidencia>): Incidencia {
  return {
    id: 'i1',
    empresa_id: 'empresa-1',
    turno_id: 't1',
    empleado_id: 'e1',
    tipo: 'otro',
    descripcion: 'algo pasó',
    estado: 'pendiente',
    created_at: `${MES_ACTUAL}-10T09:00:00Z`,
    empleado: { nombre_completo: 'Ana Gómez' },
    turno: { fecha: `${MES_ACTUAL}-10`, puesto: { nombre: 'Oficina' } },
    ...overrides,
  };
}

describe('IncidenciasJefeComponent', () => {
  let fixture: ComponentFixture<IncidenciasJefeComponent>;
  let component: IncidenciasJefeComponent;
  let incidenciasService: jasmine.SpyObj<IncidenciasService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let empresaPausada: ReturnType<typeof signal<boolean>>;
  let isHandset: ReturnType<typeof signal<boolean>>;

  function crear(incidencias: Incidencia[] = []) {
    incidenciasService = jasmine.createSpyObj('IncidenciasService', ['listar', 'actualizarEstado']);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    empresaPausada = signal(false);
    isHandset = signal(false);

    incidenciasService.listar.and.resolveTo(incidencias);

    TestBed.configureTestingModule({
      imports: [IncidenciasJefeComponent],
      providers: [
        provideNoopAnimations(),
        { provide: IncidenciasService, useValue: incidenciasService },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: AuthService, useValue: { empresaPausada } },
        { provide: ResponsiveService, useValue: { isHandset } },
      ],
    });
    TestBed.overrideComponent(IncidenciasJefeComponent, {
      add: { providers: [{ provide: MatSnackBar, useValue: snackBar }] },
    });
    fixture = TestBed.createComponent(IncidenciasJefeComponent);
    component = fixture.componentInstance;
  }

  it('ngOnInit carga las incidencias y filtra por el mes actual', async () => {
    crear([
      incidencia({ id: 'i1', turno: { fecha: `${MES_ACTUAL}-10`, puesto: null } }),
      incidencia({ id: 'i2', turno_id: null, turno: null, created_at: '2020-01-05T00:00:00Z' }), // fuera del mes actual
    ]);

    await component.ngOnInit();

    expect(component.loading()).toBe(false);
    expect(component.incidencias().map((i) => i.id)).toEqual(['i1']);
  });

  it('cuando no hay turno vinculado, filtra por la fecha de creación', async () => {
    crear([incidencia({ id: 'i-sin-turno', turno_id: null, turno: null, created_at: `${MES_ACTUAL}-05T00:00:00Z` })]);

    await component.ngOnInit();

    expect(component.incidencias().map((i) => i.id)).toEqual(['i-sin-turno']);
  });

  it('ordena las incidencias de más reciente a más antigua', async () => {
    crear([
      incidencia({ id: 'antigua', turno: { fecha: `${MES_ACTUAL}-05`, puesto: null } }),
      incidencia({ id: 'reciente', turno: { fecha: `${MES_ACTUAL}-20`, puesto: null } }),
    ]);

    await component.ngOnInit();

    expect(component.incidencias().map((i) => i.id)).toEqual(['reciente', 'antigua']);
  });

  it('onMesChange cambia el mes y vuelve a filtrar sin recargar del servicio', async () => {
    crear([
      incidencia({ id: 'este-mes', turno: { fecha: `${MES_ACTUAL}-10`, puesto: null } }),
      incidencia({ id: 'otro-mes', turno: { fecha: '2020-03-10', puesto: null } }),
    ]);
    await component.ngOnInit();
    incidenciasService.listar.calls.reset();

    component.onMesChange('2020-03');

    expect(incidenciasService.listar).not.toHaveBeenCalled();
    expect(component.incidencias().map((i) => i.id)).toEqual(['otro-mes']);
  });

  describe('cambiarEstado', () => {
    it('actualiza el estado de la incidencia al tener éxito', async () => {
      const inc = incidencia({ id: 'i1', estado: 'pendiente' });
      crear([inc]);
      await component.ngOnInit();
      incidenciasService.actualizarEstado.and.resolveTo();

      await component.cambiarEstado(inc, 'resuelta');

      expect(incidenciasService.actualizarEstado).toHaveBeenCalledWith('i1', 'resuelta');
      expect(inc.estado).toBe('resuelta');
    });

    it('si falla, muestra un snackbar y no cambia el estado', async () => {
      const inc = incidencia({ id: 'i1', estado: 'pendiente' });
      crear([inc]);
      await component.ngOnInit();
      incidenciasService.actualizarEstado.and.callFake(() => Promise.reject(new Error('no se pudo actualizar')));

      await component.cambiarEstado(inc, 'resuelta');

      expect(snackBar.open).toHaveBeenCalledWith('no se pudo actualizar', 'Cerrar', { duration: 5000 });
      expect(inc.estado).toBe('pendiente');
    });
  });

  describe('empresa pausada', () => {
    it('oculta el selector de estado y muestra la etiqueta cuando la empresa está pausada', async () => {
      crear([incidencia({})]);
      empresaPausada.set(true);
      // El primer detectChanges() ya dispara ngOnInit() por su cuenta; no hace
      // falta (ni conviene) invocarlo también a mano, o la carga se duplica.
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('mat-select')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Pendiente');
    });

    it('muestra el selector de estado cuando la empresa no está pausada', async () => {
      crear([incidencia({})]);
      // El primer detectChanges() ya dispara ngOnInit() por su cuenta; no hace
      // falta (ni conviene) invocarlo también a mano, o la carga se duplica.
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('mat-select')).not.toBeNull();
    });
  });

  describe('vista móvil (tarjetas) vs escritorio (tabla)', () => {
    it('en móvil, muestra tarjetas en lugar de la tabla', async () => {
      crear([incidencia({})]);
      isHandset.set(true);
      // El primer detectChanges() ya dispara ngOnInit() por su cuenta; no hace
      // falta (ni conviene) invocarlo también a mano, o la carga se duplica.
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.tarjetas-tabla')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('table')).toBeNull();
    });

    it('en escritorio, muestra la tabla', async () => {
      crear([incidencia({})]);
      // El primer detectChanges() ya dispara ngOnInit() por su cuenta; no hace
      // falta (ni conviene) invocarlo también a mano, o la carga se duplica.
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('table')).not.toBeNull();
    });
  });
});
