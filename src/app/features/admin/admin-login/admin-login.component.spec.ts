import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { AdminAuthService, SIN_ACCESO_MENSAJE } from '../../../core/admin/admin-auth.service';
import { AdminLoginComponent } from './admin-login.component';

describe('AdminLoginComponent', () => {
  let fixture: ComponentFixture<AdminLoginComponent>;
  let component: AdminLoginComponent;
  let adminAuthService: jasmine.SpyObj<AdminAuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    adminAuthService = jasmine.createSpyObj('AdminAuthService', ['login']);
    router = jasmine.createSpyObj('Router', ['navigateByUrl']);
    router.navigateByUrl.and.resolveTo(true);

    TestBed.configureTestingModule({
      imports: [AdminLoginComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AdminAuthService, useValue: adminAuthService },
        { provide: Router, useValue: router },
      ],
    });
    fixture = TestBed.createComponent(AdminLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function rellenarFormulario(email: string, password: string): void {
    component.form.setValue({ email, password });
  }

  it('no llama a login si el formulario es inválido', async () => {
    rellenarFormulario('no-es-un-email', '');

    await component.submit();

    expect(adminAuthService.login).not.toHaveBeenCalled();
  });

  it('inicia sesión y navega a /admin cuando las credenciales son correctas', async () => {
    rellenarFormulario('dev@limpiasoft.app', 'secreta123');
    adminAuthService.login.and.resolveTo();

    await component.submit();

    expect(adminAuthService.login).toHaveBeenCalledWith('dev@limpiasoft.app', 'secreta123');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/admin');
    expect(component.errorMessage).toBeNull();
    expect(component.loading).toBe(false);
  });

  it('muestra el mensaje de "sin acceso" cuando login lanza SIN_ACCESO_MENSAJE', async () => {
    rellenarFormulario('empleado@limpiasoft.app', 'secreta123');
    adminAuthService.login.and.callFake(() => Promise.reject(new Error(SIN_ACCESO_MENSAJE)));

    await component.submit();

    expect(component.errorMessage).toBe(SIN_ACCESO_MENSAJE);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(component.loading).toBe(false);
  });

  it('muestra un mensaje genérico cuando login falla por otro motivo', async () => {
    rellenarFormulario('dev@limpiasoft.app', 'mala');
    adminAuthService.login.and.callFake(() => Promise.reject(new Error('Invalid login credentials')));

    await component.submit();

    expect(component.errorMessage).toBe('Email o contraseña incorrectos.');
  });

  it('el botón de enviar está deshabilitado mientras el formulario es inválido', () => {
    rellenarFormulario('no-es-un-email', '');
    fixture.detectChanges();

    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(boton.disabled).toBe(true);
  });

  it('el botón de enviar se habilita cuando el formulario es válido', () => {
    rellenarFormulario('dev@limpiasoft.app', 'secreta123');
    fixture.detectChanges();

    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(boton.disabled).toBe(false);
  });

  it('el mensaje de error solo se muestra en el DOM cuando errorMessage tiene valor', async () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p.error')).toBeNull();

    rellenarFormulario('empleado@limpiasoft.app', 'secreta123');
    adminAuthService.login.and.callFake(() => Promise.reject(new Error(SIN_ACCESO_MENSAJE)));
    await component.submit();
    fixture.detectChanges();

    const parrafoError = fixture.nativeElement.querySelector('p.error');
    expect(parrafoError.textContent).toContain(SIN_ACCESO_MENSAJE);
  });
});
