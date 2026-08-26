import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { TarifasService } from '../../../core/tarifas/tarifas.service';
import { TarifaFormComponent, TarifaFormData } from './tarifa-form.component';

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

describe('TarifaFormComponent', () => {
  let fixture: ComponentFixture<TarifaFormComponent>;
  let component: TarifaFormComponent;
  let tarifasService: jasmine.SpyObj<TarifasService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<TarifaFormComponent, boolean>>;

  const DATA: TarifaFormData = { empleadoId: 'e1', empleadoNombre: 'Ana Gómez' };

  function crear(data: TarifaFormData = DATA) {
    tarifasService = jasmine.createSpyObj('TarifasService', ['crear']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [TarifaFormComponent],
      providers: [
        { provide: TarifasService, useValue: tarifasService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(TarifaFormComponent);
    component = fixture.componentInstance;
  }

  it('expone los datos inyectados', () => {
    crear();
    expect(component.data).toEqual(DATA);
  });

  it('el formulario arranca con tarifa_hora=10 y vigente_desde=hoy', () => {
    crear();
    expect(component.form.getRawValue()).toEqual({ tarifa_hora: 10, vigente_desde: hoyIso() });
  });

  describe('guardar', () => {
    it('no llama al servicio si la tarifa es negativa', async () => {
      crear();
      component.form.controls.tarifa_hora.setValue(-1);

      await component.guardar();

      expect(tarifasService.crear).not.toHaveBeenCalled();
    });

    it('crea la tarifa para el empleado indicado y cierra el diálogo con true', async () => {
      crear();
      tarifasService.crear.and.resolveTo();
      component.form.setValue({ tarifa_hora: 15, vigente_desde: '2026-09-01' });

      await component.guardar();

      expect(tarifasService.crear).toHaveBeenCalledWith({ empleado_id: 'e1', tarifa_hora: 15, vigente_desde: '2026-09-01' });
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('si el servicio falla, muestra el error y no cierra el diálogo', async () => {
      crear();
      tarifasService.crear.and.callFake(() => Promise.reject(new Error('Sesión no válida')));

      await component.guardar();

      expect(component.errorMessage).toBe('Sesión no válida');
      expect(component.guardando).toBe(false);
      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });

  it('cancelar cierra el diálogo con false', () => {
    crear();
    component.cancelar();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });
});
