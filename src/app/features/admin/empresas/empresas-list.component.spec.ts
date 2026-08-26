import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { AdminEmpresasService } from '../../../core/admin/admin-empresas.service';
import { Empresa } from '../../../core/admin/admin.models';
import { EmpresasListComponent } from './empresas-list.component';

function empresa(overrides: Partial<Empresa> = {}): Empresa {
  return {
    id: 'empresa-1',
    nombre: 'Limpiezas Prueba',
    nif: 'B12345678',
    pausada: false,
    precio_mensual: 90,
    created_at: '2026-01-01',
    ...overrides,
  };
}

describe('EmpresasListComponent', () => {
  let fixture: ComponentFixture<EmpresasListComponent>;
  let component: EmpresasListComponent;
  let empresasService: jasmine.SpyObj<AdminEmpresasService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let router: jasmine.SpyObj<Router>;

  function crear(empresas: Empresa[]) {
    empresasService = jasmine.createSpyObj('AdminEmpresasService', ['listar', 'cambiarPausa', 'eliminar']);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    router = jasmine.createSpyObj('Router', ['navigate']);

    empresasService.listar.and.resolveTo(empresas);

    TestBed.configureTestingModule({
      imports: [EmpresasListComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AdminEmpresasService, useValue: empresasService },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: Router, useValue: router },
      ],
    });
    // MatDialogModule/MatSnackBarModule importados por el propio componente crean
    // instancias reales que tapan el provider de arriba; hay que sobreescribirlas.
    TestBed.overrideComponent(EmpresasListComponent, {
      add: { providers: [{ provide: MatDialog, useValue: dialog }, { provide: MatSnackBar, useValue: snackBar }] },
    });
    fixture = TestBed.createComponent(EmpresasListComponent);
    component = fixture.componentInstance;
  }

  it('cargar() llena la lista de empresas y desactiva el loading', async () => {
    crear([empresa()]);

    await component.cargar();

    expect(component.empresas().length).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('ngOnInit() carga las empresas', async () => {
    crear([empresa(), empresa({ id: 'e2' })]);

    component.ngOnInit();
    await fixture.whenStable();

    expect(component.empresas().length).toBe(2);
  });

  it('abrirFormulario() abre el diálogo con la empresa dada y recarga si se guarda', () => {
    crear([empresa()]);
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);

    component.abrirFormulario(null);

    expect(dialog.open).toHaveBeenCalledWith(jasmine.any(Function), jasmine.objectContaining({ data: { empresa: null } }));
    expect(empresasService.listar).toHaveBeenCalled();
  });

  it('abrirFormulario() no recarga si se cancela el diálogo', () => {
    crear([empresa()]);
    empresasService.listar.calls.reset();
    dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);

    component.abrirFormulario(empresa());

    expect(empresasService.listar).not.toHaveBeenCalled();
  });

  it('verUsuarios() navega a la página de usuarios de la empresa', () => {
    crear([]);
    component.verUsuarios(empresa({ id: 'e-42' }));
    expect(router.navigate).toHaveBeenCalledWith(['/admin/empresas', 'e-42', 'usuarios']);
  });

  describe('cambiarPausa', () => {
    it('invierte el estado de pausa y recarga', async () => {
      const e = empresa({ pausada: false });
      crear([e]);
      empresasService.cambiarPausa.and.resolveTo({ ...e, pausada: true });

      await component.cambiarPausa(e);

      expect(empresasService.cambiarPausa).toHaveBeenCalledWith('empresa-1', true);
    });

    it('reanuda una empresa pausada', async () => {
      const e = empresa({ pausada: true });
      crear([e]);
      empresasService.cambiarPausa.and.resolveTo({ ...e, pausada: false });

      await component.cambiarPausa(e);

      expect(empresasService.cambiarPausa).toHaveBeenCalledWith('empresa-1', false);
    });

    it('muestra un snackbar si falla', async () => {
      const e = empresa();
      crear([e]);
      empresasService.cambiarPausa.and.callFake(() => Promise.reject(new Error('no se pudo pausar')));

      await component.cambiarPausa(e);

      expect(snackBar.open).toHaveBeenCalledWith('no se pudo pausar', 'Cerrar', { duration: 5000 });
    });
  });

  describe('eliminar', () => {
    it('pide confirmación con el nombre de la empresa y, al confirmar, elimina y recarga', async () => {
      const e = empresa({ nombre: 'A Borrar' });
      crear([e]);
      dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);
      empresasService.eliminar.and.resolveTo();

      component.eliminar(e);
      await fixture.whenStable();

      expect(dialog.open).toHaveBeenCalledWith(
        jasmine.any(Function),
        jasmine.objectContaining({ data: jasmine.objectContaining({ textoParaConfirmar: 'A Borrar' }) })
      );
      expect(empresasService.eliminar).toHaveBeenCalledWith('empresa-1');
    });

    it('no elimina si se cancela la confirmación', async () => {
      const e = empresa();
      crear([e]);
      dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);

      component.eliminar(e);
      await fixture.whenStable();

      expect(empresasService.eliminar).not.toHaveBeenCalled();
    });

    it('muestra un snackbar si falla la eliminación', async () => {
      const e = empresa();
      crear([e]);
      dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);
      empresasService.eliminar.and.callFake(() => Promise.reject(new Error('empresa con datos')));

      component.eliminar(e);
      await fixture.whenStable();

      expect(snackBar.open).toHaveBeenCalledWith('empresa con datos', 'Cerrar', { duration: 5000 });
    });
  });
});
