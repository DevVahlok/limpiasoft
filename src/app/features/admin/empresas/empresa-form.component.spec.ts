import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { AdminEmpresasService } from '../../../core/admin/admin-empresas.service';
import { Empresa } from '../../../core/admin/admin.models';
import { EmpresaFormComponent, EmpresaFormData } from './empresa-form.component';

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

describe('EmpresaFormComponent', () => {
  let fixture: ComponentFixture<EmpresaFormComponent>;
  let component: EmpresaFormComponent;
  let empresasService: jasmine.SpyObj<AdminEmpresasService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<EmpresaFormComponent, boolean>>;

  function crear(data: EmpresaFormData) {
    empresasService = jasmine.createSpyObj('AdminEmpresasService', ['crear', 'actualizar']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [EmpresaFormComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AdminEmpresasService, useValue: empresasService },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    });
    fixture = TestBed.createComponent(EmpresaFormComponent);
    component = fixture.componentInstance;
  }

  it('en modo creación, el formulario arranca vacío con el precio por defecto', () => {
    crear({ empresa: null });
    expect(component.esEdicion).toBe(false);
    expect(component.form.getRawValue()).toEqual({ nombre: '', nif: '', precioMensual: 60 });
  });

  it('en modo edición, el formulario arranca con los datos de la empresa', () => {
    crear({ empresa: empresa({ nombre: 'ACME', nif: 'B1', precio_mensual: 120 }) });
    expect(component.esEdicion).toBe(true);
    expect(component.form.getRawValue()).toEqual({ nombre: 'ACME', nif: 'B1', precioMensual: 120 });
  });

  it('guardar() no hace nada si el formulario es inválido', async () => {
    crear({ empresa: null });
    component.form.controls.nombre.setValue('');

    await component.guardar();

    expect(empresasService.crear).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('guardar() crea una empresa nueva y cierra el diálogo con true', async () => {
    crear({ empresa: null });
    component.form.setValue({ nombre: 'Nueva SL', nif: '', precioMensual: 75 });
    empresasService.crear.and.resolveTo(empresa());

    await component.guardar();

    expect(empresasService.crear).toHaveBeenCalledWith({ nombre: 'Nueva SL', nif: undefined, precio_mensual: 75 });
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('guardar() actualiza la empresa existente', async () => {
    const existente = empresa({ id: 'e-9' });
    crear({ empresa: existente });
    component.form.setValue({ nombre: 'Renombrada', nif: 'B999', precioMensual: 100 });
    empresasService.actualizar.and.resolveTo(existente);

    await component.guardar();

    expect(empresasService.actualizar).toHaveBeenCalledWith('e-9', {
      nombre: 'Renombrada',
      nif: 'B999',
      precio_mensual: 100,
    });
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('guardar() muestra un mensaje de error si falla y no cierra el diálogo', async () => {
    crear({ empresa: null });
    component.form.setValue({ nombre: 'Nueva SL', nif: '', precioMensual: 75 });
    empresasService.crear.and.callFake(() => Promise.reject(new Error('nombre duplicado')));

    await component.guardar();

    expect(component.errorMessage).toBe('nombre duplicado');
    expect(component.guardando).toBe(false);
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('cancelar() cierra el diálogo con false', () => {
    crear({ empresa: null });
    component.cancelar();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });
});
