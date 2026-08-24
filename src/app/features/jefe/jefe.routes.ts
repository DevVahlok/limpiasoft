import { Routes } from '@angular/router';

export const jefeRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/jefe-shell.component').then((m) => m.JefeShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'empleados' },
      {
        path: 'empleados',
        loadComponent: () => import('./empleados/empleados-list.component').then((m) => m.EmpleadosListComponent),
      },
      {
        path: 'puestos',
        loadComponent: () => import('./puestos/puestos-list.component').then((m) => m.PuestosListComponent),
      },
      {
        path: 'calendario',
        loadComponent: () =>
          import('../../shared/placeholder/placeholder.component').then((m) => m.PlaceholderComponent),
        data: { title: 'Calendario' },
      },
      {
        path: 'tarifas',
        loadComponent: () =>
          import('../../shared/placeholder/placeholder.component').then((m) => m.PlaceholderComponent),
        data: { title: 'Tarifas' },
      },
      {
        path: 'resumen',
        loadComponent: () =>
          import('../../shared/placeholder/placeholder.component').then((m) => m.PlaceholderComponent),
        data: { title: 'Resumen mensual' },
      },
    ],
  },
];
