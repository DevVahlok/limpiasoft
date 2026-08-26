import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { PuestoFormComponent, PuestoFormData } from './puesto-form.component';
import { Puesto, PuestosService } from './puestos.service';

function puesto(overrides: Partial<Puesto>): Puesto {
  return {
    id: 'p1',
    empresa_id: 'empresa-1',
    nombre: 'Oficina central',
    direccion: 'Calle Mayor 1',
    notas: 'notas previas',
    activo: true,
    created_at: '2026-01-01',
    ...overrides,
  };
}

describe('PuestoFormComponent', () => {
  let fixture: ComponentFixture<PuestoFormComponent>;
  let component: PuestoFormComponent;
  let puestosService: jasmine.SpyObj<PuestosService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<PuestoFormComponent, boolean>>;

  function crear(data: PuestoFormData) {
    puestosService = jasmine.createSpyObj('PuestosService', ['crear', 'actualizar']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [PuestoFormComponent],
      providers: [
        { provide: PuestosService, useValue: puestosService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(PuestoFormComponent);
    component = fixture.componentInstance;
  }

  it('esEdicion es true cuando se pasa un puesto existente', () => {
    crear({ puesto: puesto({}) });
    expect(component.esEdicion).toBe(true);
  });

  it('esEdicion es false para un puesto nuevo', () => {
    crear({ puesto: null });
    expect(component.esEdicion).toBe(false);
  });

  it('precarga el formulario con los datos del puesto', () => {
    crear({ puesto: puesto({ nombre: 'Nave 2', direccion: 'Polígono Sur', notas: 'llaves en portería' }) });
    expect(component.form.getRawValue()).toEqual({ nombre: 'Nave 2', direccion: 'Polígono Sur', notas: 'llaves en portería' });
  });

  describe('guardar', () => {
    it('no llama al servicio si el nombre está vacío', async () => {
      crear({ puesto: null });
      component.form.controls.nombre.setValue('');

      await component.guardar();

      expect(puestosService.crear).not.toHaveBeenCalled();
    });

    it('crea un puesto nuevo y cierra el diálogo con true', async () => {
      crear({ puesto: null });
      puestosService.crear.and.resolveTo(puesto({}));
      component.form.setValue({ nombre: 'Oficina nueva', direccion: '', notas: '' });

      await component.guardar();

      expect(puestosService.crear).toHaveBeenCalledWith({ nombre: 'Oficina nueva', direccion: undefined, notas: undefined });
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('actualiza un puesto existente', async () => {
      crear({ puesto: puesto({ id: 'p9' }) });
      puestosService.actualizar.and.resolveTo();
      component.form.setValue({ nombre: 'Nombre editado', direccion: 'Nueva dirección', notas: '' });

      await component.guardar();

      expect(puestosService.actualizar).toHaveBeenCalledWith('p9', {
        nombre: 'Nombre editado',
        direccion: 'Nueva dirección',
        notas: undefined,
      });
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('si el servicio falla, muestra el error y no cierra el diálogo', async () => {
      crear({ puesto: null });
      puestosService.crear.and.callFake(() => Promise.reject(new Error('ya existe un puesto con ese nombre')));
      component.form.setValue({ nombre: 'Duplicado', direccion: '', notas: '' });

      await component.guardar();

      expect(component.errorMessage).toBe('ya existe un puesto con ese nombre');
      expect(component.guardando).toBe(false);
      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });

  it('cancelar cierra el diálogo con false', () => {
    crear({ puesto: null });
    component.cancelar();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });
});
