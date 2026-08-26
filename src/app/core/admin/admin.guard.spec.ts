import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { signal } from '@angular/core';

import { adminGuard } from './admin.guard';
import { AdminAuthService } from './admin-auth.service';
import { AppAdmin } from './admin.models';

describe('adminGuard', () => {
  let adminSignal: ReturnType<typeof signal<AppAdmin | null>>;
  let router: Router;

  beforeEach(() => {
    adminSignal = signal<AppAdmin | null>(null);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AdminAuthService, useValue: { admin: adminSignal } }],
    });
    router = TestBed.inject(Router);
  });

  function ejecutar() {
    return TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));
  }

  it('permite el acceso si hay una cuenta de desarrollador cargada', () => {
    adminSignal.set({ id: '1' } as AppAdmin);
    expect(ejecutar()).toBe(true);
  });

  it('redirige a /admin/login si no hay cuenta de desarrollador', () => {
    expect(ejecutar()).toEqual(router.parseUrl('/admin/login'));
  });
});
