import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withComponentInputBinding } from '@angular/router';

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
    provideRouter(appRoutes, withComponentInputBinding()),
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
  ],
};
