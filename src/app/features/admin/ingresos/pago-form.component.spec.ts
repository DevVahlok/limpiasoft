import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { AdminPagosService } from '../../../core/admin/admin-pagos.service';
import { Empresa, Pago } from '../../../core/admin/admin.models';
import { PagoFormComponent, PagoFormData } from './pago-form.component';

function empresa(overrides: Partial<Empresa> = {}): Empresa {
  return {
    id: 'e1',
    nombre: 'Empresa 1',
    nif: null,
    pausada: false,
    precio_mensual: 100,
    created_at: '2026-01-01',
    ...overrides,
  };
}

function pago(overrides: Partial<Pago> = {}): Pago {
  return {
    id: 'p1',
    empresa_id: 'e1',
    importe: 100,
    fecha: '2026-03-10T00:00:00.000Z',
    notas: 'nota original',
    created_at: '2026-03-10',
    empresa: { nombre: 'Empresa 1' },
    ...overrides,
  };
}

describe('PagoFormComponent', () => {
  let fixture: ComponentFixture<PagoFormComponent>;
  let component: PagoFormComponent;
  let pagosService: jasmine.SpyObj<AdminPagosService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<PagoFormComponent, boolean>>;

  function crear(data: PagoFormData) {
    pagosService = jasmine.createSpyObj('AdminPagosService', ['crear', 'actualizar']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [PagoFormComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AdminPagosService, useValue: pagosService },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    });
    fixture = TestBed.createComponent(PagoFormComponent);
    component = fixture.componentInstance;
  }

  it('en modo creación, el importe por defecto es 60 y la fecha es la de hoy', () => {
    crear({ pago: null, empresas: [empresa()] });
    expect(component.esEdicion).toBe(false);
    expect(component.form.controls.importe.value).toBe(60);
    expect(component.form.controls.fecha.value).toBe(new Date().toISOString().slice(0, 10));
  });

  it('en modo edición, el formulario arranca con los datos del pago y el selector de empresa deshabilitado', () => {
    crear({ pago: pago(), empresas: [empresa()] });
    expect(component.esEdicion).toBe(true);
    expect(component.form.getRawValue()).toEqual({
      empresaId: 'e1',
      importe: 100,
      fecha: '2026-03-10',
      notas: 'nota original',
    });
    expect(component.form.controls.empresaId.disabled).toBe(true);
  });

  describe('onEmpresaSeleccionada', () => {
    it('actualiza el importe al precio mensual de la empresa elegida', () => {
      crear({ pago: null, empresas: [empresa({ id: 'e1', precio_mensual: 100 }), empresa({ id: 'e2', precio_mensual: 200 })] });

      component.onEmpresaSeleccionada('e2');

      expect(component.form.controls.importe.value).toBe(200);
    });

    it('no cambia el importe si la empresa no existe en la lista', () => {
      crear({ pago: null, empresas: [empresa({ id: 'e1', precio_mensual: 100 })] });
      component.form.controls.importe.setValue(42);

      component.onEmpresaSeleccionada('inexistente');

      expect(component.form.controls.importe.value).toBe(42);
    });
  });

  describe('guardar', () => {
    it('no hace nada si el formulario es inválido', async () => {
      crear({ pago: null, empresas: [empresa()] });
      component.form.controls.empresaId.setValue('');

      await component.guardar();

      expect(pagosService.crear).not.toHaveBeenCalled();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('crea un pago nuevo con los datos del formulario', async () => {
      crear({ pago: null, empresas: [empresa()] });
      component.form.setValue({ empresaId: 'e1', importe: 90, fecha: '2026-05-01', notas: '' });
      pagosService.crear.and.resolveTo(pago());

      await component.guardar();

      expect(pagosService.crear).toHaveBeenCalledWith({ empresaId: 'e1', importe: 90, fecha: '2026-05-01', notas: undefined });
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('actualiza un pago existente sin enviar el id de empresa', async () => {
      const existente = pago({ id: 'p-9' });
      crear({ pago: existente, empresas: [empresa()] });
      component.form.controls.importe.setValue(150);
      component.form.controls.notas.setValue('nota nueva');
      pagosService.actualizar.and.resolveTo(existente);

      await component.guardar();

      expect(pagosService.actualizar).toHaveBeenCalledWith('p-9', { importe: 150, fecha: '2026-03-10', notas: 'nota nueva' });
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('muestra un mensaje de error si falla el guardado', async () => {
      crear({ pago: null, empresas: [empresa()] });
      component.form.controls.empresaId.setValue('e1');
      pagosService.crear.and.callFake(() => Promise.reject(new Error('importe inválido')));

      await component.guardar();

      expect(component.errorMessage).toBe('importe inválido');
      expect(component.guardando).toBe(false);
      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });

  it('cancelar() cierra el diálogo con false', () => {
    crear({ pago: null, empresas: [] });
    component.cancelar();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });
});
