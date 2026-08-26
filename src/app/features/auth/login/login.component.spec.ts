import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { AuthService } from '../../../core/auth/auth.service';
import { Profile } from '../../../core/auth/auth.models';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authService: { login: jasmine.Spy; profile: () => Profile | null };
  let router: Router;

  beforeEach(() => {
    authService = { login: jasmine.createSpy('login'), profile: () => null };

    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideNoopAnimations(), provideRouter([]), { provide: AuthService, useValue: authService }],
    });
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.detectChanges();
  });

  function rellenar(username: string, pin: string) {
    component.form.controls.username.setValue(username);
    component.form.controls.pin.setValue(pin);
  }

  it('el control de PIN exige exactamente 4 dígitos, no es un input de texto libre', () => {
    component.form.controls.pin.setValue('12');
    expect(component.form.controls.pin.valid).toBe(false);

    component.form.controls.pin.setValue('1234');
    expect(component.form.controls.pin.valid).toBe(true);
  });

  it('no llama a AuthService.login si el formulario es inválido', async () => {
    rellenar('', '');
    await component.submit();
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('con credenciales válidas, inicia sesión y navega a /jefe si el perfil es de jefe', async () => {
    rellenar('ana.gomez', '1234');
    authService.login.and.resolveTo();
    authService.profile = () => ({ rol: 'jefe' } as Profile);

    await component.submit();

    expect(authService.login).toHaveBeenCalledWith('ana.gomez', '1234');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/jefe');
    expect(component.loading).toBe(false);
  });

  it('con credenciales válidas, navega a /empleado si el perfil no es de jefe', async () => {
    rellenar('luis.ruiz', '1234');
    authService.login.and.resolveTo();
    authService.profile = () => ({ rol: 'empleado' } as Profile);

    await component.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/empleado');
  });

  it('muestra un mensaje de error si el login falla', async () => {
    rellenar('ana.gomez', '9999');
    authService.login.and.callFake(() => Promise.reject(new Error('Credenciales inválidas')));

    await component.submit();

    expect(component.errorMessage).toBe('Usuario o PIN incorrectos.');
    expect(component.loading).toBe(false);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('activa loading mientras se procesa el submit', async () => {
    rellenar('ana.gomez', '1234');
    let resolverLogin!: () => void;
    authService.login.and.returnValue(new Promise<void>((resolve) => (resolverLogin = resolve)));
    authService.profile = () => ({ rol: 'jefe' } as Profile);

    const promesa = component.submit();
    expect(component.loading).toBe(true);

    resolverLogin();
    await promesa;
    expect(component.loading).toBe(false);
  });
});
