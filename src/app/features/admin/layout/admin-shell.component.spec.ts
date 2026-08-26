import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSidenav } from '@angular/material/sidenav';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';

import { AdminAuthService } from '../../../core/admin/admin-auth.service';
import { AppAdmin } from '../../../core/admin/admin.models';
import { ResponsiveService } from '../../../core/layout/responsive.service';
import { AdminShellComponent } from './admin-shell.component';

describe('AdminShellComponent', () => {
  let fixture: ComponentFixture<AdminShellComponent>;
  let component: AdminShellComponent;
  let adminAuthService: { admin: ReturnType<typeof signal<AppAdmin | null>>; logout: jasmine.Spy };
  let responsive: { isTabletOrHandset: () => boolean; isHandset: () => boolean };
  let sidenav: jasmine.SpyObj<MatSidenav>;

  function crear(isTabletOrHandset: boolean) {
    adminAuthService = {
      admin: signal<AppAdmin | null>(null),
      logout: jasmine.createSpy('logout').and.resolveTo(undefined),
    };
    responsive = { isTabletOrHandset: () => isTabletOrHandset, isHandset: () => false };

    TestBed.configureTestingModule({
      imports: [AdminShellComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: AdminAuthService, useValue: adminAuthService },
        { provide: ResponsiveService, useValue: responsive },
      ],
    });
    fixture = TestBed.createComponent(AdminShellComponent);
    component = fixture.componentInstance;
    sidenav = jasmine.createSpyObj('MatSidenav', ['close', 'toggle']);
    component.sidenav = sidenav;
  }

  it('expone los enlaces de navegación del panel de administración', () => {
    crear(false);
    expect(component.links).toEqual([
      { path: 'empresas', label: 'Empresas', icon: 'business' },
      { path: 'ingresos', label: 'Ingresos', icon: 'payments' },
      { path: 'desarrolladores', label: 'Desarrolladores', icon: 'code' },
      { path: 'investigacion', label: 'Investigación', icon: 'travel_explore' },
    ]);
  });

  describe('cerrarSiEsMovil', () => {
    it('cierra el sidenav si el viewport es tablet o móvil', () => {
      crear(true);

      component.cerrarSiEsMovil();

      expect(sidenav.close).toHaveBeenCalled();
    });

    it('no toca el sidenav si el viewport es de escritorio', () => {
      crear(false);

      component.cerrarSiEsMovil();

      expect(sidenav.close).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('cierra la sesión de administrador y navega al login', async () => {
      crear(false);
      const router = TestBed.inject(Router);
      spyOn(router, 'navigateByUrl').and.resolveTo(true);

      await component.logout();

      expect(adminAuthService.logout).toHaveBeenCalled();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/admin/login');
    });
  });
});
