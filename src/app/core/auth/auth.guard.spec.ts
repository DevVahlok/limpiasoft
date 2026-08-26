import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { signal } from '@angular/core';

import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { Profile } from './auth.models';

describe('authGuard', () => {
  let profileSignal: ReturnType<typeof signal<Profile | null>>;
  let router: Router;

  beforeEach(() => {
    profileSignal = signal<Profile | null>(null);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { profile: profileSignal } }],
    });
    router = TestBed.inject(Router);
  });

  function ejecutar() {
    return TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
  }

  it('permite el acceso si hay un perfil cargado', () => {
    profileSignal.set({ id: '1' } as Profile);
    expect(ejecutar()).toBe(true);
  });

  it('redirige a /login si no hay perfil', () => {
    const resultado = ejecutar();
    expect(resultado).toEqual(router.parseUrl('/login'));
  });
});
