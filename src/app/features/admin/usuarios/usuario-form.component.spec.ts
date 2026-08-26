import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { AdminUsuariosService } from '../../../core/admin/admin-usuarios.service';
import { Profile } from '../../../core/auth/auth.models';
import { UsuarioFormComponent, UsuarioFormData } from './usuario-form.component';

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

describe('UsuarioFormComponent', () => {
  let fixture: ComponentFixture<UsuarioFormComponent>;
  let component: UsuarioFormComponent;
  let usuariosService: jasmine.SpyObj<AdminUsuariosService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<UsuarioFormComponent, boolean>>;

  function crear(data: UsuarioFormData) {
    usuariosService = jasmine.createSpyObj('AdminUsuariosService', ['crear', 'actualizar']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [UsuarioFormComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AdminUsuariosService, useValue: usuariosService },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    });
    fixture = TestBed.createComponent(UsuarioFormComponent);
    component = fixture.componentInstance;
  }

  it('en modo creación, el formulario arranca con rol "empleado" y PIN "0000"', () => {
    crear({ empresaId: 'empresa-1', usuario: null });
    expect(component.esEdicion).toBe(false);
    expect(component.form.getRawValue()).toEqual({ rol: 'empleado', nombreCompleto: '', telefono: '', pin: '0000' });
  });

  it('en modo edición, el formulario arranca con los datos del usuario', () => {
    crear({ empresaId: 'empresa-1', usuario: usuario({ rol: 'jefe', nombre_completo: 'Luis Ruiz', telefono: '600999888' }) });
    expect(component.esEdicion).toBe(true);
    expect(component.form.controls.rol.value).toBe('jefe');
    expect(component.form.controls.nombreCompleto.value).toBe('Luis Ruiz');
    expect(component.form.controls.telefono.value).toBe('600999888');
  });

  describe('guardar', () => {
    it('no hace nada si el formulario es inválido', async () => {
      crear({ empresaId: 'empresa-1', usuario: null });
      component.form.controls.nombreCompleto.setValue('');

      await component.guardar();

      expect(usuariosService.crear).not.toHaveBeenCalled();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('crea un usuario nuevo incluyendo el pin y el id de empresa', async () => {
      crear({ empresaId: 'empresa-1', usuario: null });
      component.form.setValue({ rol: 'jefe', nombreCompleto: 'Nuevo Jefe', telefono: '600123456', pin: '9999' });
      usuariosService.crear.and.resolveTo({ id: 'u-nuevo', username: 'nuevo.jefe' });

      await component.guardar();

      expect(usuariosService.crear).toHaveBeenCalledWith({
        empresaId: 'empresa-1',
        rol: 'jefe',
        nombreCompleto: 'Nuevo Jefe',
        telefono: '600123456',
        pin: '9999',
      });
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('crea un usuario sin teléfono cuando el campo está vacío', async () => {
      crear({ empresaId: 'empresa-1', usuario: null });
      component.form.setValue({ rol: 'empleado', nombreCompleto: 'Sin Tel', telefono: '', pin: '1111' });
      usuariosService.crear.and.resolveTo({ id: 'u-nuevo', username: 'sin.tel' });

      await component.guardar();

      expect(usuariosService.crear).toHaveBeenCalledWith(
        jasmine.objectContaining({ telefono: undefined })
      );
    });

    it('actualiza un usuario existente sin enviar el pin', async () => {
      const existente = usuario({ id: 'u-9' });
      crear({ empresaId: 'empresa-1', usuario: existente });
      component.form.controls.nombreCompleto.setValue('Nombre Editado');
      usuariosService.actualizar.and.resolveTo(existente);

      await component.guardar();

      expect(usuariosService.actualizar).toHaveBeenCalledWith('u-9', {
        rol: 'empleado',
        nombreCompleto: 'Nombre Editado',
        telefono: '600111222',
      });
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('muestra un mensaje de error si falla el guardado', async () => {
      crear({ empresaId: 'empresa-1', usuario: null });
      component.form.controls.nombreCompleto.setValue('X');
      usuariosService.crear.and.callFake(() => Promise.reject(new Error('nombre de usuario duplicado')));

      await component.guardar();

      expect(component.errorMessage).toBe('nombre de usuario duplicado');
      expect(component.guardando).toBe(false);
      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });

  it('cancelar() cierra el diálogo con false', () => {
    crear({ empresaId: 'empresa-1', usuario: null });
    component.cancelar();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });
});
