import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { signal } from '@angular/core';

import { roleGuard } from './role.guard';
import { AuthService } from './auth.service';
import { Profile } from './auth.models';

describe('roleGuard', () => {
  let profileSignal: ReturnType<typeof signal<Profile | null>>;
  let router: Router;

  beforeEach(() => {
    profileSignal = signal<Profile | null>(null);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { profile: profileSignal } }],
    });
    router = TestBed.inject(Router);
  });

  function ejecutar(rolRequerido: 'jefe' | 'empleado') {
    return TestBed.runInInjectionContext(() => roleGuard(rolRequerido)({} as never, {} as never));
  }

  it('redirige a /login si no hay perfil', () => {
    expect(ejecutar('jefe')).toEqual(router.parseUrl('/login'));
  });

  it('permite el acceso si el rol del perfil coincide con el requerido', () => {
    profileSignal.set({ rol: 'jefe' } as Profile);
    expect(ejecutar('jefe')).toBe(true);
  });

  it('redirige a /jefe si un jefe intenta entrar a una ruta de empleado', () => {
    profileSignal.set({ rol: 'jefe' } as Profile);
    expect(ejecutar('empleado')).toEqual(router.parseUrl('/jefe'));
  });

  it('redirige a /empleado si un empleado intenta entrar a una ruta de jefe', () => {
    profileSignal.set({ rol: 'empleado' } as Profile);
    expect(ejecutar('jefe')).toEqual(router.parseUrl('/empleado'));
  });
});
