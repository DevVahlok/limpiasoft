import { Routes } from '@angular/router';

import { adminGuard } from './core/admin/admin.guard';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const appRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./features/auth/registro-empresa/registro-empresa.component').then((m) => m.RegistroEmpresaComponent),
  },
  {
    path: 'admin/login',
    loadComponent: () => import('./features/admin/admin-login/admin-login.component').then((m) => m.AdminLoginComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.adminRoutes),
  },
  {
    path: 'jefe',
    canActivate: [authGuard, roleGuard('jefe')],
    loadChildren: () => import('./features/jefe/jefe.routes').then((m) => m.jefeRoutes),
  },
  {
    path: 'empleado',
    canActivate: [authGuard, roleGuard('empleado')],
    loadChildren: () => import('./features/empleado/empleado.routes').then((m) => m.empleadoRoutes),
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
