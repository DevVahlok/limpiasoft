import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';

import { EmpleadoFormComponent } from './empleado-form.component';
import { EmpleadosService } from './empleados.service';

describe('EmpleadoFormComponent', () => {
  let fixture: ComponentFixture<EmpleadoFormComponent>;
  let component: EmpleadoFormComponent;
  let empleadosService: jasmine.SpyObj<EmpleadosService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<EmpleadoFormComponent>>;

  function crear() {
    empleadosService = jasmine.createSpyObj('EmpleadosService', ['crear']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [EmpleadoFormComponent],
      providers: [
        { provide: EmpleadosService, useValue: empleadosService },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    });
    fixture = TestBed.createComponent(EmpleadoFormComponent);
    component = fixture.componentInstance;
  }

  it('el formulario arranca con los valores por defecto', () => {
    crear();
    expect(component.form.getRawValue()).toEqual({
      rol: 'empleado',
      nombreCompleto: '',
      telefono: '',
      tarifaHora: 10,
      pin: '0000',
    });
  });

  describe('validadores de tarifaHora según el rol', () => {
    it('al cambiar a jefe, la tarifa deja de ser obligatoria', () => {
      crear();
      component.form.controls.tarifaHora.setValue(null as unknown as number);
      component.form.controls.rol.setValue('jefe');
      expect(component.form.controls.tarifaHora.valid).toBe(true);
    });

    it('al volver a empleado, la tarifa vuelve a ser obligatoria', () => {
      crear();
      component.form.controls.rol.setValue('jefe');
      component.form.controls.tarifaHora.setValue(null as unknown as number);
      component.form.controls.rol.setValue('empleado');
      expect(component.form.controls.tarifaHora.valid).toBe(false);
      expect(component.form.controls.tarifaHora.errors?.['required']).toBeTruthy();
    });

    it('una tarifa negativa es inválida para un empleado', () => {
      crear();
      component.form.controls.tarifaHora.setValue(-5);
      expect(component.form.controls.tarifaHora.errors?.['min']).toBeTruthy();
    });
  });

  describe('guardar', () => {
    function llenarFormularioValido() {
      component.form.setValue({ rol: 'empleado', nombreCompleto: 'Ana Gómez', telefono: '', tarifaHora: 12, pin: '1234' });
    }

    it('no llama al servicio si el formulario es inválido', async () => {
      crear();
      component.form.controls.nombreCompleto.setValue('');

      await component.guardar();

      expect(empleadosService.crear).not.toHaveBeenCalled();
    });

    it('crea el empleado con los datos del formulario y cierra el diálogo con el resultado', async () => {
      crear();
      llenarFormularioValido();
      const resultado = { id: 'u1', username: 'ana.gomez' };
      empleadosService.crear.and.resolveTo(resultado);

      await component.guardar();

      expect(empleadosService.crear).toHaveBeenCalledWith({
        rol: 'empleado',
        nombreCompleto: 'Ana Gómez',
        telefono: undefined,
        tarifaHora: 12,
        pin: '1234',
      });
      expect(dialogRef.close).toHaveBeenCalledWith(resultado);
    });

    it('envía el teléfono cuando se rellena', async () => {
      crear();
      component.form.setValue({ rol: 'empleado', nombreCompleto: 'Ana Gómez', telefono: '600111222', tarifaHora: 12, pin: '1234' });
      empleadosService.crear.and.resolveTo({ id: 'u1', username: 'ana.gomez' });

      await component.guardar();

      expect(empleadosService.crear).toHaveBeenCalledWith(jasmine.objectContaining({ telefono: '600111222' }));
    });

    it('para un jefe, no envía tarifaHora aunque el control tenga un valor', async () => {
      crear();
      component.form.setValue({ rol: 'jefe', nombreCompleto: 'Luis Ruiz', telefono: '', tarifaHora: 999, pin: '1234' });
      empleadosService.crear.and.resolveTo({ id: 'u2', username: 'luis.ruiz' });

      await component.guardar();

      expect(empleadosService.crear).toHaveBeenCalledWith(jasmine.objectContaining({ rol: 'jefe', tarifaHora: undefined }));
    });

    it('si el servicio falla, muestra el error y no cierra el diálogo', async () => {
      crear();
      llenarFormularioValido();
      empleadosService.crear.and.callFake(() => Promise.reject(new Error('el nombre de usuario ya existe')));

      await component.guardar();

      expect(component.errorMessage).toBe('el nombre de usuario ya existe');
      expect(component.guardando).toBe(false);
      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });

  it('cancelar cierra el diálogo sin resultado', () => {
    crear();
    component.cancelar();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
