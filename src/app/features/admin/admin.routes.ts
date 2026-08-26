import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'empresas' },
      {
        path: 'empresas',
        loadComponent: () => import('./empresas/empresas-list.component').then((m) => m.EmpresasListComponent),
      },
      {
        path: 'empresas/:empresaId/usuarios',
        loadComponent: () => import('./usuarios/usuarios-list.component').then((m) => m.UsuariosListComponent),
      },
      {
        path: 'desarrolladores',
        loadComponent: () =>
          import('./desarrolladores/desarrolladores-list.component').then((m) => m.DesarrolladoresListComponent),
      },
      {
        path: 'ingresos',
        loadComponent: () => import('./ingresos/ingresos.component').then((m) => m.IngresosComponent),
      },
      {
        path: 'investigacion',
        loadComponent: () => import('./investigacion/investigacion.component').then((m) => m.InvestigacionComponent),
      },
    ],
  },
];
