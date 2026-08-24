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
          import('./calendario/calendario-empleado.component').then((m) => m.CalendarioEmpleadoComponent),
      },
      {
        path: 'incidencias',
        loadComponent: () =>
          import('./incidencias/incidencias-empleado.component').then((m) => m.IncidenciasEmpleadoComponent),
      },
      {
        path: 'resumen',
        loadComponent: () => import('./resumen/resumen-empleado.component').then((m) => m.ResumenEmpleadoComponent),
      },
    ],
  },
];
