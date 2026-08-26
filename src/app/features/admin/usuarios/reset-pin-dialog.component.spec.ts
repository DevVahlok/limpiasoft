import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { AdminUsuariosService } from '../../../core/admin/admin-usuarios.service';
import { ResetPinDialogComponent, ResetPinDialogData } from './reset-pin-dialog.component';

describe('ResetPinDialogComponent', () => {
  let fixture: ComponentFixture<ResetPinDialogComponent>;
  let component: ResetPinDialogComponent;
  let usuariosService: jasmine.SpyObj<AdminUsuariosService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ResetPinDialogComponent, boolean>>;

  function crear(data: ResetPinDialogData) {
    usuariosService = jasmine.createSpyObj('AdminUsuariosService', ['resetearPin']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [ResetPinDialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AdminUsuariosService, useValue: usuariosService },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    });
    fixture = TestBed.createComponent(ResetPinDialogComponent);
    component = fixture.componentInstance;
  }

  it('el PIN por defecto es "0000"', () => {
    crear({ usuarioId: 'u1', nombreCompleto: 'Ana Gómez' });
    expect(component.form.controls.pin.value).toBe('0000');
    expect(component.form.valid).toBe(true);
  });

  it('un PIN que no son 4 dígitos hace el formulario inválido', () => {
    crear({ usuarioId: 'u1', nombreCompleto: 'Ana Gómez' });
    component.form.controls.pin.setValue('12a4');
    expect(component.form.invalid).toBe(true);
  });

  describe('guardar', () => {
    it('no hace nada si el formulario es inválido', async () => {
      crear({ usuarioId: 'u1', nombreCompleto: 'Ana Gómez' });
      component.form.controls.pin.setValue('abc');

      await component.guardar();

      expect(usuariosService.resetearPin).not.toHaveBeenCalled();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('resetea el PIN del usuario y cierra el diálogo con true', async () => {
      crear({ usuarioId: 'u1', nombreCompleto: 'Ana Gómez' });
      component.form.controls.pin.setValue('4321');
      usuariosService.resetearPin.and.resolveTo();

      await component.guardar();

      expect(usuariosService.resetearPin).toHaveBeenCalledWith('u1', '4321');
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('muestra un mensaje de error si falla el reseteo', async () => {
      crear({ usuarioId: 'u1', nombreCompleto: 'Ana Gómez' });
      usuariosService.resetearPin.and.callFake(() => Promise.reject(new Error('usuario no encontrado')));

      await component.guardar();

      expect(component.errorMessage).toBe('usuario no encontrado');
      expect(component.guardando).toBe(false);
      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });

  it('cancelar() cierra el diálogo con false', () => {
    crear({ usuarioId: 'u1', nombreCompleto: 'Ana Gómez' });
    component.cancelar();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });
});
