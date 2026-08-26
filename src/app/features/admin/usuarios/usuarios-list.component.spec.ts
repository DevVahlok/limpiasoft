import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AdminEmpresasService } from '../../../core/admin/admin-empresas.service';
import { AdminUsuariosService } from '../../../core/admin/admin-usuarios.service';
import { Empresa } from '../../../core/admin/admin.models';
import { Profile } from '../../../core/auth/auth.models';
import { UsuariosListComponent } from './usuarios-list.component';

function empresa(overrides: Partial<Empresa> = {}): Empresa {
  return {
    id: 'empresa-1',
    nombre: 'Limpiezas Prueba',
    nif: null,
    pausada: false,
    precio_mensual: 90,
    created_at: '2026-01-01',
    ...overrides,
  };
}

function usuario(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'u1',
    empresa_id: 'empresa-1',
    rol: 'empleado',
    nombre_completo: 'Ana Gómez',
    username: 'ana.gomez',
    email: 'ana.gomez@limpiasoft.local',
    telefono: '600111222',
    activo: true,
    created_at: '2026-01-01',
    empresa: null,
    ...overrides,
  };
}

describe('UsuariosListComponent', () => {
  let fixture: ComponentFixture<UsuariosListComponent>;
  let component: UsuariosListComponent;
  let usuariosService: jasmine.SpyObj<AdminUsuariosService>;
  let empresasService: jasmine.SpyObj<AdminEmpresasService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  function crear(datos: { usuarios: Profile[]; empresas: Empresa[] }) {
    usuariosService = jasmine.createSpyObj('AdminUsuariosService', ['listar', 'actualizar', 'eliminar']);
    empresasService = jasmine.createSpyObj('AdminEmpresasService', ['listar']);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    usuariosService.listar.and.resolveTo(datos.usuarios);
    empresasService.listar.and.resolveTo(datos.empresas);

    TestBed.configureTestingModule({
      imports: [UsuariosListComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: AdminUsuariosService, useValue: usuariosService },
        { provide: AdminEmpresasService, useValue: empresasService },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    TestBed.overrideComponent(UsuariosListComponent, {
      add: { providers: [{ provide: MatDialog, useValue: dialog }, { provide: MatSnackBar, useValue: snackBar }] },
    });
    fixture = TestBed.createComponent(UsuariosListComponent);
    component = fixture.componentInstance;
    component.empresaId = 'empresa-1';
  }

  it('cargar() llena los usuarios y el nombre de la empresa correspondiente', async () => {
    crear({ usuarios: [usuario()], empresas: [empresa({ id: 'empresa-1', nombre: 'Limpiezas Prueba' })] });

    await component.cargar();

    expect(usuariosService.listar).toHaveBeenCalledWith('empresa-1');
    expect(component.usuarios().length).toBe(1);
    expect(component.nombreEmpresa()).toBe('Limpiezas Prueba');
    expect(component.loading()).toBe(false);
  });

  it('nombreEmpresa queda vacío si la empresa no aparece en la lista', async () => {
    crear({ usuarios: [], empresas: [empresa({ id: 'otra-empresa' })] });
    await component.cargar();
    expect(component.nombreEmpresa()).toBe('');
  });

  it('ngOnInit() carga los usuarios', async () => {
    crear({ usuarios: [usuario()], empresas: [empresa()] });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.usuarios().length).toBe(1);
  });

  it('abrirFormulario() abre el diálogo con la empresa y el usuario dados, y recarga si se guarda', () => {
    crear({ usuarios: [], empresas: [] });
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);

    component.abrirFormulario(null);

    expect(dialog.open).toHaveBeenCalledWith(
      jasmine.any(Function),
      jasmine.objectContaining({ data: { empresaId: 'empresa-1', usuario: null } })
    );
    expect(usuariosService.listar).toHaveBeenCalled();
  });

  it('abrirFormulario() no recarga si se cancela', () => {
    crear({ usuarios: [], empresas: [] });
    usuariosService.listar.calls.reset();
    dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);

    component.abrirFormulario(usuario());

    expect(usuariosService.listar).not.toHaveBeenCalled();
  });

  describe('resetearPin', () => {
    it('abre el diálogo de reseteo con los datos del usuario y muestra un snackbar si se completa', () => {
      crear({ usuarios: [], empresas: [] });
      const u = usuario({ id: 'u-5', nombre_completo: 'Carlos Ruiz' });
      dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);

      component.resetearPin(u);

      expect(dialog.open).toHaveBeenCalledWith(
        jasmine.any(Function),
        jasmine.objectContaining({ data: { usuarioId: 'u-5', nombreCompleto: 'Carlos Ruiz' } })
      );
      expect(snackBar.open).toHaveBeenCalledWith('PIN actualizado.', 'Cerrar', { duration: 4000 });
    });

    it('no muestra snackbar si se cancela el diálogo de reseteo', () => {
      crear({ usuarios: [], empresas: [] });
      dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);

      component.resetearPin(usuario());

      expect(snackBar.open).not.toHaveBeenCalled();
    });
  });

  describe('cambiarActivo', () => {
    it('invierte el estado activo del usuario y recarga', async () => {
      const u = usuario({ activo: true });
      crear({ usuarios: [u], empresas: [] });

      await component.cambiarActivo(u);

      expect(usuariosService.actualizar).toHaveBeenCalledWith('u1', { activo: false });
    });

    it('muestra un snackbar si falla', async () => {
      const u = usuario();
      crear({ usuarios: [u], empresas: [] });
      usuariosService.actualizar.and.callFake(() => Promise.reject(new Error('no se pudo actualizar')));

      await component.cambiarActivo(u);

      expect(snackBar.open).toHaveBeenCalledWith('no se pudo actualizar', 'Cerrar', { duration: 5000 });
    });
  });

  describe('eliminar', () => {
    it('pide confirmación y, al confirmar, elimina y recarga', async () => {
      const u = usuario();
      crear({ usuarios: [u], empresas: [] });
      dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);
      usuariosService.eliminar.and.resolveTo();

      component.eliminar(u);
      await fixture.whenStable();

      expect(usuariosService.eliminar).toHaveBeenCalledWith('u1');
    });

    it('no elimina si se cancela la confirmación', async () => {
      const u = usuario();
      crear({ usuarios: [u], empresas: [] });
      dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);

      component.eliminar(u);
      await fixture.whenStable();

      expect(usuariosService.eliminar).not.toHaveBeenCalled();
    });

    it('muestra un snackbar si falla la eliminación', async () => {
      const u = usuario();
      crear({ usuarios: [u], empresas: [] });
      dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);
      usuariosService.eliminar.and.callFake(() => Promise.reject(new Error('usuario con turnos asignados')));

      component.eliminar(u);
      await fixture.whenStable();

      expect(snackBar.open).toHaveBeenCalledWith('usuario con turnos asignados', 'Cerrar', { duration: 5000 });
    });
  });
});
