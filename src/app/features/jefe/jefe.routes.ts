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
        loadComponent: () => import('./calendario/calendario-jefe.component').then((m) => m.CalendarioJefeComponent),
      },
      {
        path: 'incidencias',
        loadComponent: () =>
          import('./incidencias/incidencias-jefe.component').then((m) => m.IncidenciasJefeComponent),
      },
      {
        path: 'tarifas',
        loadComponent: () => import('./tarifas/tarifas-list.component').then((m) => m.TarifasListComponent),
      },
      {
        path: 'resumen',
        loadComponent: () =>
          import('./resumen/resumen-mensual.component').then((m) => m.ResumenMensualComponent),
      },
    ],
  },
];
