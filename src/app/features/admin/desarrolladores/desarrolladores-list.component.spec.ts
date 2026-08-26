import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { AdminAuthService } from '../../../core/admin/admin-auth.service';
import { AdminDesarrolladoresService } from '../../../core/admin/admin-desarrolladores.service';
import { AppAdmin } from '../../../core/admin/admin.models';
import { ResponsiveService } from '../../../core/layout/responsive.service';
import { DesarrolladoresListComponent } from './desarrolladores-list.component';

function desarrollador(id: string, nombre: string, email: string): AppAdmin {
  return { id, nombre_completo: nombre, email, created_at: '2026-01-01' };
}

describe('DesarrolladoresListComponent', () => {
  let fixture: ComponentFixture<DesarrolladoresListComponent>;
  let component: DesarrolladoresListComponent;
  let desarrolladoresService: jasmine.SpyObj<AdminDesarrolladoresService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  function crear(opciones: { lista?: AppAdmin[]; miId?: string; isHandset?: boolean } = {}) {
    desarrolladoresService = jasmine.createSpyObj('AdminDesarrolladoresService', ['listar', 'eliminar']);
    desarrolladoresService.listar.and.resolveTo(opciones.lista ?? []);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      imports: [DesarrolladoresListComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AdminDesarrolladoresService, useValue: desarrolladoresService },
        { provide: AdminAuthService, useValue: { admin: () => (opciones.miId ? ({ id: opciones.miId } as AppAdmin) : null) } },
        { provide: ResponsiveService, useValue: { isHandset: () => opciones.isHandset ?? false } },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    // MatDialogModule y MatSnackBarModule, importados por el propio componente,
    // crean una instancia real de MatDialog/MatSnackBar que tapa el provider de
    // arriba; hay que sobreescribirlo también a nivel del propio componente.
    TestBed.overrideComponent(DesarrolladoresListComponent, {
      add: { providers: [{ provide: MatDialog, useValue: dialog }, { provide: MatSnackBar, useValue: snackBar }] },
    });
    fixture = TestBed.createComponent(DesarrolladoresListComponent);
    component = fixture.componentInstance;
  }

  it('carga la lista de desarrolladores en ngOnInit', async () => {
    crear({ lista: [desarrollador('1', 'Ana Gómez', 'ana@limpiasoft.app')] });

    component.ngOnInit();
    await fixture.whenStable();

    expect(desarrolladoresService.listar).toHaveBeenCalled();
    expect(component.desarrolladores()).toEqual([desarrollador('1', 'Ana Gómez', 'ana@limpiasoft.app')]);
    expect(component.loading()).toBe(false);
  });

  it('miPropioId refleja el id de la cuenta de desarrollador conectada', () => {
    crear({ miId: 'yo-mismo' });
    expect(component.miPropioId).toBe('yo-mismo');
  });

  describe('abrirFormulario', () => {
    it('abre el formulario en modo creación y recarga la lista al guardar', async () => {
      crear({ lista: [] });
      await component.cargar();
      dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);

      component.abrirFormulario(null);
      await fixture.whenStable();

      expect(dialog.open).toHaveBeenCalledWith(jasmine.any(Function), { width: '420px', data: { desarrollador: null } });
      expect(desarrolladoresService.listar).toHaveBeenCalledTimes(2);
    });

    it('abre el formulario en modo edición con los datos del desarrollador', () => {
      crear({ lista: [] });
      const dev = desarrollador('1', 'Ana Gómez', 'ana@limpiasoft.app');
      dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);

      component.abrirFormulario(dev);

      expect(dialog.open).toHaveBeenCalledWith(jasmine.any(Function), { width: '420px', data: { desarrollador: dev } });
    });

    it('no recarga la lista si se cancela el formulario', async () => {
      crear({ lista: [] });
      await component.cargar();
      dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);

      component.abrirFormulario(null);
      await fixture.whenStable();

      expect(desarrolladoresService.listar).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetearPassword', () => {
    it('muestra un snackbar de confirmación cuando se resetea la contraseña', async () => {
      crear({ lista: [] });
      const dev = desarrollador('1', 'Ana Gómez', 'ana@limpiasoft.app');
      dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);

      component.resetearPassword(dev);
      await fixture.whenStable();

      expect(dialog.open).toHaveBeenCalledWith(jasmine.any(Function), {
        width: '360px',
        data: { desarrolladorId: '1', nombreCompleto: 'Ana Gómez' },
      });
      expect(snackBar.open).toHaveBeenCalledWith('Contraseña actualizada.', 'Cerrar', { duration: 4000 });
    });

    it('no muestra snackbar si se cancela el reseteo', async () => {
      crear({ lista: [] });
      const dev = desarrollador('1', 'Ana Gómez', 'ana@limpiasoft.app');
      dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);

      component.resetearPassword(dev);
      await fixture.whenStable();

      expect(snackBar.open).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('pide confirmación con el nombre del desarrollador y, al confirmar, lo elimina y recarga', async () => {
      crear({ lista: [] });
      await component.cargar();
      const dev = desarrollador('1', 'Ana Gómez', 'ana@limpiasoft.app');
      dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);
      desarrolladoresService.eliminar.and.resolveTo();

      component.eliminar(dev);
      await fixture.whenStable();

      expect(dialog.open).toHaveBeenCalledWith(jasmine.any(Function), {
        width: '420px',
        data: {
          titulo: 'Eliminar desarrollador',
          mensaje: 'Se borrará la cuenta de acceso de Ana Gómez.',
        },
      });
      expect(desarrolladoresService.eliminar).toHaveBeenCalledWith('1');
      expect(desarrolladoresService.listar).toHaveBeenCalledTimes(2);
    });

    it('no elimina nada si se cancela la confirmación', async () => {
      crear({ lista: [] });
      const dev = desarrollador('1', 'Ana Gómez', 'ana@limpiasoft.app');
      dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);

      component.eliminar(dev);
      await fixture.whenStable();

      expect(desarrolladoresService.eliminar).not.toHaveBeenCalled();
    });

    it('muestra un snackbar con el mensaje de error si falla la eliminación', async () => {
      crear({ lista: [] });
      const dev = desarrollador('1', 'Ana Gómez', 'ana@limpiasoft.app');
      dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);
      desarrolladoresService.eliminar.and.callFake(() => Promise.reject(new Error('No puedes borrar tu propia cuenta.')));

      component.eliminar(dev);
      await fixture.whenStable();

      expect(snackBar.open).toHaveBeenCalledWith('No puedes borrar tu propia cuenta.', 'Cerrar', { duration: 5000 });
    });
  });

  describe('plantilla', () => {
    it('deshabilita el botón de eliminar la propia cuenta en la vista de tabla', async () => {
      crear({
        lista: [desarrollador('yo-mismo', 'Ana Gómez', 'ana@limpiasoft.app'), desarrollador('otro', 'Luis Ruiz', 'luis@limpiasoft.app')],
        miId: 'yo-mismo',
        isHandset: false,
      });
      // El primer detectChanges() ya dispara ngOnInit(), que llama a cargar()
      // por su cuenta; no hace falta (ni conviene) invocarlo también a mano.
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const botonesEliminar: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll(
        'button[aria-label*="borrar" i], button[aria-label*="eliminar" i]',
      );
      expect(botonesEliminar.length).toBe(2);
      expect(botonesEliminar[0].disabled).toBe(true);
      expect(botonesEliminar[1].disabled).toBe(false);
    });
  });
});
