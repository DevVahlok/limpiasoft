import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { Profile } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { ResponsiveService } from '../../../core/layout/responsive.service';
import { EmpleadoFormComponent } from './empleado-form.component';
import { EmpleadosListComponent } from './empleados-list.component';
import { EmpleadosService } from './empleados.service';

function empleado(overrides: Partial<Profile>): Profile {
  return {
    id: 'e1',
    empresa_id: 'empresa-1',
    rol: 'empleado',
    nombre_completo: 'Ana Gómez',
    username: 'ana.gomez',
    email: 'ana.gomez@limpiasoft.app',
    telefono: null,
    activo: true,
    created_at: '2026-01-01',
    empresa: null,
    ...overrides,
  };
}

describe('EmpleadosListComponent', () => {
  let fixture: ComponentFixture<EmpleadosListComponent>;
  let component: EmpleadosListComponent;
  let empleadosService: jasmine.SpyObj<EmpleadosService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let empresaPausada: ReturnType<typeof signal<boolean>>;
  let isHandset: ReturnType<typeof signal<boolean>>;

  function crear(empleados: Profile[] = []) {
    empleadosService = jasmine.createSpyObj('EmpleadosService', ['listarUsuarios']);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    empresaPausada = signal(false);
    isHandset = signal(false);

    empleadosService.listarUsuarios.and.resolveTo(empleados);

    TestBed.configureTestingModule({
      imports: [EmpleadosListComponent],
      providers: [
        provideNoopAnimations(),
        { provide: EmpleadosService, useValue: empleadosService },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: AuthService, useValue: { empresaPausada } },
        { provide: ResponsiveService, useValue: { isHandset } },
      ],
    });
    TestBed.overrideComponent(EmpleadosListComponent, {
      add: { providers: [{ provide: MatDialog, useValue: dialog }, { provide: MatSnackBar, useValue: snackBar }] },
    });
    fixture = TestBed.createComponent(EmpleadosListComponent);
    component = fixture.componentInstance;
  }

  it('ngOnInit carga la lista de usuarios y desactiva el loading', async () => {
    crear([empleado({})]);
    component.ngOnInit();
    await fixture.whenStable();

    expect(component.empleados()).toEqual([empleado({})]);
    expect(component.loading()).toBe(false);
  });

  describe('abrirFormulario', () => {
    it('al crear un usuario, muestra un snackbar con el usuario asignado y recarga la lista', async () => {
      crear([]);
      await component.cargar();
      empleadosService.listarUsuarios.calls.reset();
      dialog.open.and.returnValue({ afterClosed: () => of({ id: 'u1', username: 'ana.gomez' }) } as never);

      component.abrirFormulario();
      await fixture.whenStable();

      expect(dialog.open).toHaveBeenCalledWith(EmpleadoFormComponent, { width: '420px' });
      expect(snackBar.open).toHaveBeenCalledWith('Usuario creado. Usuario: ana.gomez (PIN inicial ya establecido)', 'Cerrar', {
        duration: 15000,
      });
      expect(empleadosService.listarUsuarios).toHaveBeenCalled();
    });

    it('si se cancela el diálogo, no muestra snackbar ni recarga', async () => {
      crear([]);
      await component.cargar();
      empleadosService.listarUsuarios.calls.reset();
      dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as never);

      component.abrirFormulario();
      await fixture.whenStable();

      expect(snackBar.open).not.toHaveBeenCalled();
      expect(empleadosService.listarUsuarios).not.toHaveBeenCalled();
    });
  });

  describe('empresa pausada', () => {
    it('oculta el botón de nuevo usuario cuando la empresa está pausada', async () => {
      crear([]);
      empresaPausada.set(true);
      // El primer detectChanges() ya dispara ngOnInit(), que llama a cargar()
      // por su cuenta; no hace falta (ni conviene) invocarlo también a mano.
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const boton = fixture.nativeElement.querySelector('.header button');
      expect(boton).toBeNull();
    });

    it('muestra el botón de nuevo usuario cuando la empresa no está pausada', async () => {
      crear([]);
      // El primer detectChanges() ya dispara ngOnInit(), que llama a cargar()
      // por su cuenta; no hace falta (ni conviene) invocarlo también a mano.
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const boton = fixture.nativeElement.querySelector('.header button');
      expect(boton).not.toBeNull();
    });
  });

  describe('vista móvil (tarjetas) vs escritorio (tabla)', () => {
    it('en móvil, muestra tarjetas en lugar de la tabla', async () => {
      crear([empleado({})]);
      isHandset.set(true);
      // El primer detectChanges() ya dispara ngOnInit(), que llama a cargar()
      // por su cuenta; no hace falta (ni conviene) invocarlo también a mano.
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.tarjetas-tabla')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('table')).toBeNull();
    });

    it('en escritorio, muestra la tabla en lugar de tarjetas', async () => {
      crear([empleado({})]);
      // El primer detectChanges() ya dispara ngOnInit(), que llama a cargar()
      // por su cuenta; no hace falta (ni conviene) invocarlo también a mano.
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('table')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.tarjetas-tabla')).toBeNull();
    });
  });
});
