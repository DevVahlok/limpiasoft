import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { AdminProspectosService } from '../../../core/admin/admin-prospectos.service';
import { Prospecto } from '../../../core/admin/admin.models';
import { CIUDADES } from '../../../core/admin/ciudades';
import { ProspectoFormComponent, ProspectoFormData } from './prospecto-form.component';

function prospecto(overrides: Partial<Prospecto> = {}): Prospecto {
  return {
    id: 'pr1',
    nombre: 'Prospecto 1',
    ciudad: CIUDADES[0].nombre,
    direccion: 'Calle Falsa 123',
    telefono: '600000000',
    web: 'ejemplo.com',
    notas: 'nota',
    lat: 36.68,
    lng: -6.13,
    created_at: '2026-01-01',
    ...overrides,
  };
}

describe('ProspectoFormComponent', () => {
  let fixture: ComponentFixture<ProspectoFormComponent>;
  let component: ProspectoFormComponent;
  let prospectosService: jasmine.SpyObj<AdminProspectosService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ProspectoFormComponent, boolean>>;

  function crear(data: ProspectoFormData) {
    prospectosService = jasmine.createSpyObj('AdminProspectosService', ['crear', 'actualizar']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [ProspectoFormComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AdminProspectosService, useValue: prospectosService },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    });
    fixture = TestBed.createComponent(ProspectoFormComponent);
    component = fixture.componentInstance;
  }

  it('en modo creación, toma la ciudad y las coordenadas pasadas en los datos del diálogo', () => {
    crear({ prospecto: null, ciudad: CIUDADES[1].nombre, lat: 10, lng: 20 });

    expect(component.esEdicion).toBe(false);
    expect(component.form.getRawValue()).toEqual({
      nombre: '',
      ciudad: CIUDADES[1].nombre,
      direccion: '',
      telefono: '',
      web: '',
      notas: '',
      lat: 10,
      lng: 20,
    });
  });

  it('en modo creación sin coordenadas, lat/lng arrancan a null', () => {
    crear({ prospecto: null, ciudad: CIUDADES[0].nombre });
    expect(component.form.controls.lat.value).toBeNull();
    expect(component.form.controls.lng.value).toBeNull();
  });

  it('en modo edición, el formulario arranca con los datos del prospecto', () => {
    crear({ prospecto: prospecto(), ciudad: CIUDADES[0].nombre });

    expect(component.esEdicion).toBe(true);
    expect(component.form.getRawValue()).toEqual({
      nombre: 'Prospecto 1',
      ciudad: CIUDADES[0].nombre,
      direccion: 'Calle Falsa 123',
      telefono: '600000000',
      web: 'ejemplo.com',
      notas: 'nota',
      lat: 36.68,
      lng: -6.13,
    });
  });

  describe('guardar', () => {
    it('no hace nada si el formulario es inválido', async () => {
      crear({ prospecto: null, ciudad: CIUDADES[0].nombre });
      component.form.controls.nombre.setValue('');

      await component.guardar();

      expect(prospectosService.crear).not.toHaveBeenCalled();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('crea un prospecto nuevo, convirtiendo los campos vacíos y nulos en undefined', async () => {
      crear({ prospecto: null, ciudad: CIUDADES[0].nombre });
      component.form.setValue({
        nombre: 'Nuevo',
        ciudad: CIUDADES[0].nombre,
        direccion: '',
        telefono: '',
        web: '',
        notas: '',
        lat: null,
        lng: null,
      });
      prospectosService.crear.and.resolveTo(prospecto());

      await component.guardar();

      expect(prospectosService.crear).toHaveBeenCalledWith({
        nombre: 'Nuevo',
        ciudad: CIUDADES[0].nombre,
        direccion: undefined,
        telefono: undefined,
        web: undefined,
        notas: undefined,
        lat: undefined,
        lng: undefined,
      });
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('crea un prospecto con coordenadas cuando vienen del clic en el mapa', async () => {
      crear({ prospecto: null, ciudad: CIUDADES[0].nombre, lat: 36.5, lng: -6.2 });
      component.form.controls.nombre.setValue('Con coords');
      prospectosService.crear.and.resolveTo(prospecto());

      await component.guardar();

      expect(prospectosService.crear).toHaveBeenCalledWith(jasmine.objectContaining({ lat: 36.5, lng: -6.2 }));
    });

    it('actualiza un prospecto existente', async () => {
      const existente = prospecto({ id: 'pr-9' });
      crear({ prospecto: existente, ciudad: CIUDADES[0].nombre });
      component.form.controls.nombre.setValue('Actualizado');
      prospectosService.actualizar.and.resolveTo(existente);

      await component.guardar();

      expect(prospectosService.actualizar).toHaveBeenCalledWith('pr-9', jasmine.objectContaining({ nombre: 'Actualizado' }));
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('muestra un mensaje de error si falla el guardado', async () => {
      crear({ prospecto: null, ciudad: CIUDADES[0].nombre });
      component.form.controls.nombre.setValue('X');
      prospectosService.crear.and.callFake(() => Promise.reject(new Error('nombre duplicado')));

      await component.guardar();

      expect(component.errorMessage).toBe('nombre duplicado');
      expect(component.guardando).toBe(false);
      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });

  it('cancelar() cierra el diálogo con false', () => {
    crear({ prospecto: null, ciudad: CIUDADES[0].nombre });
    component.cancelar();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });
});
