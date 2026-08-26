import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { AdminDesarrolladoresService } from '../../../core/admin/admin-desarrolladores.service';
import { AppAdmin } from '../../../core/admin/admin.models';
import { DesarrolladorFormComponent, DesarrolladorFormData } from './desarrollador-form.component';

describe('DesarrolladorFormComponent', () => {
  let fixture: ComponentFixture<DesarrolladorFormComponent>;
  let component: DesarrolladorFormComponent;
  let desarrolladoresService: jasmine.SpyObj<AdminDesarrolladoresService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<DesarrolladorFormComponent, boolean>>;

  function crear(data: DesarrolladorFormData) {
    desarrolladoresService = jasmine.createSpyObj('AdminDesarrolladoresService', ['crear', 'actualizar']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [DesarrolladorFormComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AdminDesarrolladoresService, useValue: desarrolladoresService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(DesarrolladorFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('modo creación (sin desarrollador)', () => {
    beforeEach(() => {
      crear({ desarrollador: null });
    });

    it('esEdicion es false y el campo password es obligatorio', () => {
      expect(component.esEdicion).toBe(false);
      expect(component.form.controls.password.hasError('required')).toBe(true);
    });

    it('no llama a crear si el formulario es inválido', async () => {
      await component.guardar();
      expect(desarrolladoresService.crear).not.toHaveBeenCalled();
    });

    it('crea el desarrollador con los datos del formulario y cierra el diálogo con true', async () => {
      component.form.setValue({ nombreCompleto: 'Luis Ruiz', email: 'luis@limpiasoft.app', password: 'clave1234' });
      desarrolladoresService.crear.and.resolveTo({ id: '1', email: 'luis@limpiasoft.app' });

      await component.guardar();

      expect(desarrolladoresService.crear).toHaveBeenCalledWith({
        email: 'luis@limpiasoft.app',
        password: 'clave1234',
        nombreCompleto: 'Luis Ruiz',
      });
      expect(dialogRef.close).toHaveBeenCalledWith(true);
      expect(component.guardando).toBe(false);
    });

    it('muestra un mensaje de error y no cierra el diálogo si falla la creación', async () => {
      component.form.setValue({ nombreCompleto: 'Luis Ruiz', email: 'luis@limpiasoft.app', password: 'clave1234' });
      desarrolladoresService.crear.and.callFake(() => Promise.reject(new Error('El email ya está en uso.')));

      await component.guardar();

      expect(component.errorMessage).toBe('El email ya está en uso.');
      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(component.guardando).toBe(false);
    });
  });

  describe('modo edición (con desarrollador)', () => {
    const desarrollador = { id: '9', email: 'ana@limpiasoft.app', nombre_completo: 'Ana Gómez' } as AppAdmin;

    beforeEach(() => {
      crear({ desarrollador });
    });

    it('esEdicion es true, precarga nombre/email y no exige password', () => {
      expect(component.esEdicion).toBe(true);
      expect(component.form.controls.nombreCompleto.value).toBe('Ana Gómez');
      expect(component.form.controls.email.value).toBe('ana@limpiasoft.app');
      expect(component.form.valid).toBe(true);
    });

    it('actualiza el desarrollador solo con el nombre completo y cierra el diálogo con true', async () => {
      component.form.controls.nombreCompleto.setValue('Ana G. Actualizada');
      desarrolladoresService.actualizar.and.resolveTo({ ...desarrollador, nombre_completo: 'Ana G. Actualizada' });

      await component.guardar();

      expect(desarrolladoresService.actualizar).toHaveBeenCalledWith('9', 'Ana G. Actualizada');
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });
  });

  describe('cancelar', () => {
    it('cierra el diálogo con false', () => {
      crear({ desarrollador: null });
      component.cancelar();
      expect(dialogRef.close).toHaveBeenCalledWith(false);
    });
  });
});
