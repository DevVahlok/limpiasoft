import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';

import { AuthService } from '../../../core/auth/auth.service';
import { Profile } from '../../../core/auth/auth.models';
import { IncidenciasService } from '../../../core/incidencias/incidencias.service';
import { ResponsiveService } from '../../../core/layout/responsive.service';
import { CambiarPinComponent } from '../../../shared/cambiar-pin/cambiar-pin.component';
import { JefeShellComponent } from './jefe-shell.component';

describe('JefeShellComponent', () => {
  let fixture: ComponentFixture<JefeShellComponent>;
  let component: JefeShellComponent;
  let dialog: jasmine.SpyObj<MatDialog>;
  let authService: { profile: ReturnType<typeof signal<Profile | null>>; logout: jasmine.Spy };
  let incidenciasService: jasmine.SpyObj<IncidenciasService>;
  let responsive: { isHandset: ReturnType<typeof signal<boolean>>; isTabletOrHandset: ReturnType<typeof signal<boolean>> };
  let router: Router;

  beforeEach(() => {
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    authService = { profile: signal<Profile | null>({ nombre_completo: 'Ana Gómez', empresa: { nombre: 'Acme', pausada: false } } as Profile), logout: jasmine.createSpy('logout').and.resolveTo() };
    incidenciasService = jasmine.createSpyObj('IncidenciasService', ['refrescarPendientes'], { pendientesCount: signal(0) });
    incidenciasService.refrescarPendientes.and.resolveTo();
    responsive = { isHandset: signal(false), isTabletOrHandset: signal(false) };

    TestBed.configureTestingModule({
      imports: [JefeShellComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: IncidenciasService, useValue: incidenciasService },
        { provide: ResponsiveService, useValue: responsive },
        { provide: MatDialog, useValue: dialog },
      ],
    });
    // MatDialogModule está importado por el propio componente y crea una instancia
    // real de MatDialog que tapa el provider de arriba; hay que sobreescribirlo
    // también a nivel del propio componente (ver CONVENTIONS.md, punto 3).
    TestBed.overrideComponent(JefeShellComponent, {
      add: { providers: [{ provide: MatDialog, useValue: dialog }] },
    });
    fixture = TestBed.createComponent(JefeShellComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.detectChanges();
  });

  it('ngOnInit refresca el contador de incidencias pendientes', () => {
    expect(incidenciasService.refrescarPendientes).toHaveBeenCalled();
  });

  it('cambiarPin abre el diálogo CambiarPinComponent', () => {
    component.cambiarPin();
    expect(dialog.open).toHaveBeenCalledWith(CambiarPinComponent, { width: '360px' });
  });

  it('logout cierra sesión y navega a /login', async () => {
    await component.logout();
    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  describe('cerrarSiEsMovil', () => {
    it('cierra el sidenav si está en móvil o tablet', () => {
      responsive.isTabletOrHandset.set(true);
      spyOn(component.sidenav, 'close');

      component.cerrarSiEsMovil();

      expect(component.sidenav.close).toHaveBeenCalled();
    });

    it('no cierra el sidenav en escritorio', () => {
      responsive.isTabletOrHandset.set(false);
      spyOn(component.sidenav, 'close');

      component.cerrarSiEsMovil();

      expect(component.sidenav.close).not.toHaveBeenCalled();
    });
  });

  describe('banner de empresa pausada', () => {
    it('se muestra cuando la empresa del perfil está pausada', () => {
      authService.profile.set({ nombre_completo: 'Ana', empresa: { nombre: 'Acme', pausada: true } } as Profile);
      fixture.detectChanges();

      const banner = fixture.nativeElement.querySelector('.banner-pausada');
      expect(banner).toBeTruthy();
    });

    it('no se muestra cuando la empresa no está pausada', () => {
      authService.profile.set({ nombre_completo: 'Ana', empresa: { nombre: 'Acme', pausada: false } } as Profile);
      fixture.detectChanges();

      const banner = fixture.nativeElement.querySelector('.banner-pausada');
      expect(banner).toBeFalsy();
    });
  });
});
