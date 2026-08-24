import { Routes } from '@angular/router';

export const empleadoRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/empleado-shell.component').then((m) => m.EmpleadoShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'calendario' },
      {
        path: 'calendario',
        loadComponent: () =>
          import('../../shared/placeholder/placeholder.component').then((m) => m.PlaceholderComponent),
        data: { title: 'Mi calendario' },
      },
      {
        path: 'incidencias',
        loadComponent: () =>
          import('../../shared/placeholder/placeholder.component').then((m) => m.PlaceholderComponent),
        data: { title: 'Incidencias' },
      },
    ],
  },
];
