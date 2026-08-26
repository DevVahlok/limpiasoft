import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { AdminEmpresasService } from '../../../core/admin/admin-empresas.service';
import { AdminPagosService } from '../../../core/admin/admin-pagos.service';
import { Empresa, Pago } from '../../../core/admin/admin.models';
import { IngresosComponent } from './ingresos.component';

function empresa(overrides: Partial<Empresa> = {}): Empresa {
  return {
    id: 'e1',
    nombre: 'Empresa 1',
    nif: null,
    pausada: false,
    precio_mensual: 100,
    created_at: '2026-01-01',
    ...overrides,
  };
}

function pago(overrides: Partial<Pago> = {}): Pago {
  return {
    id: 'p1',
    empresa_id: 'e1',
    importe: 100,
    fecha: '2026-01-15',
    notas: null,
    created_at: '2026-01-15',
    empresa: { nombre: 'Empresa 1' },
    ...overrides,
  };
}

/** Mismo cálculo que usa el componente para el mes actual, para no depender de una fecha fija. */
function mesActualIso(): string {
  return new Date().toISOString().slice(0, 7);
}

describe('IngresosComponent', () => {
  let fixture: ComponentFixture<IngresosComponent>;
  let component: IngresosComponent;
  let empresasService: jasmine.SpyObj<AdminEmpresasService>;
  let pagosService: jasmine.SpyObj<AdminPagosService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  function crear(datos: { empresas: Empresa[]; pagos: Pago[] }) {
    empresasService = jasmine.createSpyObj('AdminEmpresasService', ['listar']);
    pagosService = jasmine.createSpyObj('AdminPagosService', ['listar', 'eliminar']);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    empresasService.listar.and.resolveTo(datos.empresas);
    pagosService.listar.and.resolveTo(datos.pagos);

    TestBed.configureTestingModule({
      imports: [IngresosComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AdminEmpresasService, useValue: empresasService },
        { provide: AdminPagosService, useValue: pagosService },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    TestBed.overrideComponent(IngresosComponent, {
      add: { providers: [{ provide: MatDialog, useValue: dialog }, { provide: MatSnackBar, useValue: snackBar }] },
    });
    fixture = TestBed.createComponent(IngresosComponent);
    component = fixture.componentInstance;
  }

  it('cargar() llena empresas y pagos y desactiva el loading', async () => {
    crear({ empresas: [empresa()], pagos: [pago()] });

    await component.cargar();

    expect(component.empresas().length).toBe(1);
    expect(component.pagos().length).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('activas y pausadas separan las empresas según el flag pausada', async () => {
    crear({
      empresas: [empresa({ id: 'e1', pausada: false }), empresa({ id: 'e2', pausada: true }), empresa({ id: 'e3', pausada: false })],
      pagos: [],
    });
    await component.cargar();

    expect(component.activas().map((e) => e.id)).toEqual(['e1', 'e3']);
    expect(component.pausadas().map((e) => e.id)).toEqual(['e2']);
  });

  it('ingresoProyectado suma el precio mensual solo de las empresas activas', async () => {
    crear({
      empresas: [
        empresa({ id: 'e1', pausada: false, precio_mensual: 100 }),
        empresa({ id: 'e2', pausada: true, precio_mensual: 200 }),
        empresa({ id: 'e3', pausada: false, precio_mensual: 50 }),
      ],
      pagos: [],
    });
    await component.cargar();

    expect(component.ingresoProyectado()).toBe(150);
  });

  it('precioMedio divide el ingreso proyectado entre el número de empresas activas', async () => {
    crear({
      empresas: [empresa({ id: 'e1', pausada: false, precio_mensual: 100 }), empresa({ id: 'e2', pausada: false, precio_mensual: 50 })],
      pagos: [],
    });
    await component.cargar();

    expect(component.precioMedio()).toBe(75);
  });

  it('precioMedio es 0 si no hay empresas activas', async () => {
    crear({ empresas: [empresa({ pausada: true })], pagos: [] });
    await component.cargar();

    expect(component.precioMedio()).toBe(0);
  });

  it('porcentajeActivas calcula el porcentaje sobre el total de empresas', async () => {
    crear({
      empresas: [empresa({ id: 'e1', pausada: false }), empresa({ id: 'e2', pausada: false }), empresa({ id: 'e3', pausada: true }), empresa({ id: 'e4', pausada: true })],
      pagos: [],
    });
    await component.cargar();

    expect(component.porcentajeActivas()).toBe(50);
  });

  it('porcentajeActivas es 0 si no hay empresas', async () => {
    crear({ empresas: [], pagos: [] });
    await component.cargar();

    expect(component.porcentajeActivas()).toBe(0);
  });

  it('donutGradient refleja el porcentaje de empresas activas', async () => {
    crear({ empresas: [empresa({ id: 'e1', pausada: false }), empresa({ id: 'e2', pausada: true })], pagos: [] });
    await component.cargar();

    expect(component.donutGradient()).toBe('conic-gradient(#1e7e34 0 50%, #e0e0e0 50% 100%)');
  });

  it('ingresosEsteMes suma solo los pagos cuya fecha cae en el mes actual', async () => {
    const mesActual = mesActualIso();
    crear({
      empresas: [],
      pagos: [
        pago({ id: 'p1', fecha: `${mesActual}-05`, importe: 100 }),
        pago({ id: 'p2', fecha: `${mesActual}-20`, importe: 50 }),
        pago({ id: 'p3', fecha: '2020-01-01', importe: 999 }),
      ],
    });
    await component.cargar();

    expect(component.ingresosEsteMes()).toBe(150);
  });

  describe('barrasProyeccion', () => {
    it('ordena las empresas activas de mayor a menor precio y calcula el porcentaje relativo al máximo', async () => {
      crear({
        empresas: [
          empresa({ id: 'e1', nombre: 'Baja', pausada: false, precio_mensual: 25 }),
          empresa({ id: 'e2', nombre: 'Alta', pausada: false, precio_mensual: 100 }),
          empresa({ id: 'e3', nombre: 'Pausada', pausada: true, precio_mensual: 500 }),
        ],
        pagos: [],
      });
      await component.cargar();

      const barras = component.barrasProyeccion();
      expect(barras.map((b) => b.nombre)).toEqual(['Alta', 'Baja']);
      expect(barras[0].porcentaje).toBe(100);
      expect(barras[1].porcentaje).toBe(25);
    });

    it('está vacío si no hay empresas activas', async () => {
      crear({ empresas: [empresa({ pausada: true })], pagos: [] });
      await component.cargar();

      expect(component.barrasProyeccion()).toEqual([]);
    });
  });

  describe('barrasMensuales', () => {
    it('agrupa los pagos del mes actual en el último de los 6 meses', async () => {
      const mesActual = mesActualIso();
      crear({
        empresas: [],
        pagos: [pago({ id: 'p1', fecha: `${mesActual}-10`, importe: 80 }), pago({ id: 'p2', fecha: `${mesActual}-20`, importe: 20 })],
      });
      await component.cargar();

      const meses = component.barrasMensuales();
      expect(meses.length).toBe(6);
      expect(meses[meses.length - 1].clave).toBe(mesActual);
      expect(meses[meses.length - 1].total).toBe(100);
      expect(meses[meses.length - 1].porcentaje).toBe(100);
    });

    it('ignora los pagos fuera de la ventana de los últimos 6 meses', async () => {
      crear({ empresas: [], pagos: [pago({ fecha: '2000-01-01', importe: 999 })] });
      await component.cargar();

      const total = component.barrasMensuales().reduce((acc, m) => acc + m.total, 0);
      expect(total).toBe(0);
    });
  });

  it('abrirFormulario() abre el diálogo de pago con las empresas cargadas y recarga si se guarda', async () => {
    crear({ empresas: [empresa()], pagos: [] });
    await component.cargar();
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);

    component.abrirFormulario(null);

    expect(dialog.open).toHaveBeenCalledWith(
      jasmine.any(Function),
      jasmine.objectContaining({ data: { pago: null, empresas: component.empresas() } })
    );
    expect(pagosService.listar).toHaveBeenCalledTimes(2);
  });

  describe('eliminar', () => {
    it('pide confirmación y, al confirmar, elimina el pago y recarga', async () => {
      const p = pago();
      crear({ empresas: [], pagos: [p] });
      await component.cargar();
      dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);
      pagosService.eliminar.and.resolveTo();

      component.eliminar(p);
      await fixture.whenStable();

      expect(pagosService.eliminar).toHaveBeenCalledWith('p1');
    });

    it('no elimina si se cancela la confirmación', async () => {
      const p = pago();
      crear({ empresas: [], pagos: [p] });
      dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);

      component.eliminar(p);
      await fixture.whenStable();

      expect(pagosService.eliminar).not.toHaveBeenCalled();
    });

    it('muestra un snackbar si falla la eliminación', async () => {
      const p = pago();
      crear({ empresas: [], pagos: [p] });
      dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);
      pagosService.eliminar.and.callFake(() => Promise.reject(new Error('no se pudo eliminar')));

      component.eliminar(p);
      await fixture.whenStable();

      expect(snackBar.open).toHaveBeenCalledWith('no se pudo eliminar', 'Cerrar', { duration: 5000 });
    });
  });
});
