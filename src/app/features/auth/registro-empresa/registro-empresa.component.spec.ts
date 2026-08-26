import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { AuthService } from '../../../core/auth/auth.service';
import { RegistroEmpresaComponent } from './registro-empresa.component';

describe('RegistroEmpresaComponent', () => {
  let fixture: ComponentFixture<RegistroEmpresaComponent>;
  let component: RegistroEmpresaComponent;
  let authService: { signUpEmpresa: jasmine.Spy };
  let router: Router;

  beforeEach(() => {
    authService = { signUpEmpresa: jasmine.createSpy('signUpEmpresa') };

    TestBed.configureTestingModule({
      imports: [RegistroEmpresaComponent],
      providers: [provideNoopAnimations(), provideRouter([]), { provide: AuthService, useValue: authService }],
    });
    fixture = TestBed.createComponent(RegistroEmpresaComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.detectChanges();
  });

  function rellenar(nombreEmpresa: string, nombreCompleto: string, pin = '0000') {
    component.form.controls.nombreEmpresa.setValue(nombreEmpresa);
    component.form.controls.nombreCompleto.setValue(nombreCompleto);
    component.form.controls.pin.setValue(pin);
  }

  it('el PIN viene precargado a 0000 por defecto', () => {
    expect(component.form.controls.pin.value).toBe('0000');
    expect(component.form.controls.pin.valid).toBe(true);
  });

  it('el formulario es inválido sin nombre de empresa o nombre completo', () => {
    component.form.controls.nombreEmpresa.setValue('');
    component.form.controls.nombreCompleto.setValue('');
    expect(component.form.invalid).toBe(true);
  });

  it('no llama a AuthService.signUpEmpresa si el formulario es inválido', async () => {
    component.form.controls.nombreEmpresa.setValue('');
    await component.submit();
    expect(authService.signUpEmpresa).not.toHaveBeenCalled();
  });

  it('registra la empresa y navega a /jefe si tiene éxito', async () => {
    rellenar('Limpiezas Acme', 'Ana Gómez', '1234');
    authService.signUpEmpresa.and.resolveTo('ana.gomez');

    await component.submit();

    expect(authService.signUpEmpresa).toHaveBeenCalledWith({
      nombreEmpresa: 'Limpiezas Acme',
      nombreCompleto: 'Ana Gómez',
      pin: '1234',
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/jefe');
    expect(component.loading).toBe(false);
  });

  it('muestra el mensaje del error si signUpEmpresa lanza un Error', async () => {
    rellenar('Limpiezas Acme', 'Ana Gómez');
    authService.signUpEmpresa.and.callFake(() => Promise.reject(new Error('Ya existe una empresa con ese nombre')));

    await component.submit();

    expect(component.errorMessage).toBe('Ya existe una empresa con ese nombre');
    expect(component.loading).toBe(false);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('muestra un mensaje genérico si el error no es una instancia de Error', async () => {
    rellenar('Limpiezas Acme', 'Ana Gómez');
    authService.signUpEmpresa.and.callFake(() => Promise.reject('fallo desconocido'));

    await component.submit();

    expect(component.errorMessage).toBe('No se pudo completar el registro.');
  });
});
