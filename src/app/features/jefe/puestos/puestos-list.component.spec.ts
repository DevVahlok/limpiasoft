import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { ResponsiveService } from '../../../core/layout/responsive.service';
import { PuestoFormComponent } from './puesto-form.component';
import { PuestosListComponent } from './puestos-list.component';
import { Puesto, PuestosService } from './puestos.service';

function puesto(overrides: Partial<Puesto>): Puesto {
  return {
    id: 'p1',
    empresa_id: 'empresa-1',
    nombre: 'Oficina central',
    direccion: 'Calle Mayor 1',
    notas: null,
    activo: true,
    created_at: '2026-01-01',
    ...overrides,
  };
}

describe('PuestosListComponent', () => {
  let fixture: ComponentFixture<PuestosListComponent>;
  let component: PuestosListComponent;
  let puestosService: jasmine.SpyObj<PuestosService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let empresaPausada: ReturnType<typeof signal<boolean>>;
  let isHandset: ReturnType<typeof signal<boolean>>;

  function crear(puestos: Puesto[] = []) {
    puestosService = jasmine.createSpyObj('PuestosService', ['listar', 'cambiarActivo']);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    empresaPausada = signal(false);
    isHandset = signal(false);

    puestosService.listar.and.resolveTo(puestos);

    TestBed.configureTestingModule({
      imports: [PuestosListComponent],
      providers: [
        provideNoopAnimations(),
        { provide: PuestosService, useValue: puestosService },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: AuthService, useValue: { empresaPausada } },
        { provide: ResponsiveService, useValue: { isHandset } },
      ],
    });
    TestBed.overrideComponent(PuestosListComponent, {
      add: { providers: [{ provide: MatDialog, useValue: dialog }, { provide: MatSnackBar, useValue: snackBar }] },
    });
    fixture = TestBed.createComponent(PuestosListComponent);
    component = fixture.componentInstance;
  }

  it('cargar rellena la lista de puestos y desactiva el loading', async () => {
    crear([puesto({})]);
    await component.cargar();
    expect(component.puestos()).toEqual([puesto({})]);
    expect(component.loading()).toBe(false);
  });

  describe('abrirFormulario', () => {
    it('abre PuestoFormComponent con el puesto a editar', () => {
      crear([]);
      dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);
      const p = puesto({});

      component.abrirFormulario(p);

      expect(dialog.open).toHaveBeenCalledWith(PuestoFormComponent, { width: '420px', data: { puesto: p } });
    });

    it('abre el formulario con puesto null para crear uno nuevo', () => {
      crear([]);
      dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);

      component.abrirFormulario(null);

      expect(dialog.open).toHaveBeenCalledWith(PuestoFormComponent, { width: '420px', data: { puesto: null } });
    });

    it('si se guarda, recarga la lista', async () => {
      crear([]);
      await component.cargar();
      puestosService.listar.calls.reset();
      dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);

      component.abrirFormulario(null);
      await fixture.whenStable();

      expect(puestosService.listar).toHaveBeenCalled();
    });
  });

  describe('cambiarActivo', () => {
    it('activa/desactiva el puesto y recarga la lista', async () => {
      crear([]);
      const p = puesto({ activo: true });
      puestosService.cambiarActivo.and.resolveTo();

      await component.cambiarActivo(p);

      expect(puestosService.cambiarActivo).toHaveBeenCalledWith('p1', false);
    });

    it('si falla, muestra un snackbar con el error', async () => {
      crear([]);
      const p = puesto({ activo: true });
      puestosService.cambiarActivo.and.callFake(() => Promise.reject(new Error('no se pudo actualizar el puesto')));

      await component.cambiarActivo(p);

      expect(snackBar.open).toHaveBeenCalledWith('no se pudo actualizar el puesto', 'Cerrar', { duration: 5000 });
    });
  });

  describe('empresa pausada', () => {
    it('oculta el botón de nuevo puesto y las acciones de la tabla', async () => {
      crear([puesto({})]);
      empresaPausada.set(true);
      // El primer detectChanges() dispara ngOnInit(), que ya llama a cargar() por su cuenta;
      // no hace falta (ni conviene) invocarlo también a mano.
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.header button')).toBeNull();
      const filaAcciones = fixture.nativeElement.querySelector('td.acciones');
      expect(filaAcciones?.querySelector('button')).toBeFalsy();
    });

    it('muestra el botón de nuevo puesto y las acciones cuando no está pausada', async () => {
      crear([puesto({})]);
      // El primer detectChanges() dispara ngOnInit(), que ya llama a cargar() por su cuenta;
      // no hace falta (ni conviene) invocarlo también a mano.
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.header button')).not.toBeNull();
      const filaAcciones = fixture.nativeElement.querySelector('td.acciones');
      expect(filaAcciones?.querySelectorAll('button').length).toBe(2);
    });
  });

  describe('vista móvil (tarjetas) vs escritorio (tabla)', () => {
    it('en móvil, muestra tarjetas con chip de estado', async () => {
      crear([puesto({ activo: false })]);
      isHandset.set(true);
      // El primer detectChanges() dispara ngOnInit(), que ya llama a cargar() por su cuenta;
      // no hace falta (ni conviene) invocarlo también a mano.
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.tarjetas-tabla')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('table')).toBeNull();
      expect(fixture.nativeElement.querySelector('.chip-inactivo')).not.toBeNull();
    });

    it('en escritorio, muestra la tabla', async () => {
      crear([puesto({})]);
      // El primer detectChanges() dispara ngOnInit(), que ya llama a cargar() por su cuenta;
      // no hace falta (ni conviene) invocarlo también a mano.
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('table')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.tarjetas-tabla')).toBeNull();
    });
  });
});
