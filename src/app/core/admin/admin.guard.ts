import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AdminAuthService } from './admin-auth.service';

export const adminGuard: CanActivateFn = () => {
  const adminAuthService = inject(AdminAuthService);
  const router = inject(Router);

  return adminAuthService.admin() ? true : router.parseUrl('/admin/login');
};
