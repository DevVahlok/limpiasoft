import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withComponentInputBinding, withHashLocation } from '@angular/router';

import { AdminAuthService } from './core/admin/admin-auth.service';
import { AuthService } from './core/auth/auth.service';
import { appRoutes } from './app.routes';

function initAuth(authService: AuthService) {
  return () => authService.restoreSession();
}

function initAdminAuth(adminAuthService: AdminAuthService) {
  return () => adminAuthService.restoreSession();
}

export const appConfig: ApplicationConfig = {
  providers: [
    // withHashLocation: la app se sirve como sitio estático en GitHub Pages, que no puede
    // redirigir rutas internas (/jefe/calendario) de vuelta a index.html en un refresco directo.
    provideRouter(appRoutes, withComponentInputBinding(), withHashLocation()),
    provideAnimations(),
    {
      provide: APP_INITIALIZER,
      useFactory: initAuth,
      deps: [AuthService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initAdminAuth,
      deps: [AdminAuthService],
      multi: true,
    },
    {
      provide: MAT_DIALOG_DEFAULT_OPTIONS,
      useValue: { maxWidth: '95vw', maxHeight: '90vh' },
    },
  ],
};
