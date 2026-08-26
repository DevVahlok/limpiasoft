import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { AdminDesarrolladoresService } from '../../../core/admin/admin-desarrolladores.service';
import { ResetPasswordDialogComponent, ResetPasswordDialogData } from './reset-password-dialog.component';

describe('ResetPasswordDialogComponent', () => {
  let fixture: ComponentFixture<ResetPasswordDialogComponent>;
  let component: ResetPasswordDialogComponent;
  let desarrolladoresService: jasmine.SpyObj<AdminDesarrolladoresService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ResetPasswordDialogComponent, boolean>>;

  const data: ResetPasswordDialogData = { desarrolladorId: '9', nombreCompleto: 'Ana Gómez' };

  beforeEach(() => {
    desarrolladoresService = jasmine.createSpyObj('AdminDesarrolladoresService', ['resetearPassword']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [ResetPasswordDialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AdminDesarrolladoresService, useValue: desarrolladoresService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(ResetPasswordDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('expone los datos del diálogo', () => {
    expect(component.data).toEqual(data);
  });

  it('no llama al servicio si la contraseña no cumple la longitud mínima', async () => {
    component.form.controls.password.setValue('corta');

    await component.guardar();

    expect(desarrolladoresService.resetearPassword).not.toHaveBeenCalled();
  });

  it('resetea la contraseña con el id del desarrollador y cierra el diálogo con true', async () => {
    component.form.controls.password.setValue('nuevaClave123');
    desarrolladoresService.resetearPassword.and.resolveTo();

    await component.guardar();

    expect(desarrolladoresService.resetearPassword).toHaveBeenCalledWith('9', 'nuevaClave123');
    expect(dialogRef.close).toHaveBeenCalledWith(true);
    expect(component.guardando).toBe(false);
  });

  it('muestra un mensaje de error y no cierra el diálogo si falla el reseteo', async () => {
    component.form.controls.password.setValue('nuevaClave123');
    desarrolladoresService.resetearPassword.and.callFake(() => Promise.reject(new Error('No se pudo resetear la contraseña.')));

    await component.guardar();

    expect(component.errorMessage).toBe('No se pudo resetear la contraseña.');
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.guardando).toBe(false);
  });

  it('cancelar() cierra el diálogo con false', () => {
    component.cancelar();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });
});
