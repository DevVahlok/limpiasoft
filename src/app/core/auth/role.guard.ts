import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Rol } from './auth.models';
import { AuthService } from './auth.service';

export function roleGuard(rol: Rol): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const profile = authService.profile();

    if (!profile) {
      return router.parseUrl('/login');
    }
    if (profile.rol !== rol) {
      return router.parseUrl(profile.rol === 'jefe' ? '/jefe' : '/empleado');
    }
    return true;
  };
}
