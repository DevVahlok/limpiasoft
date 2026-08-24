import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';

import { AuthService } from '../../../core/auth/auth.service';
import { EstadoIncidencia, Incidencia } from '../../../core/incidencias/incidencia.models';
import { IncidenciasService } from '../../../core/incidencias/incidencias.service';
import { mesActualIso, rangoDelMes } from '../../../core/turnos/fecha.util';
import { FechaEsPipe } from '../../../shared/pipes/fecha-es.pipe';
import { SelectorMesComponent } from '../../../shared/selector-mes/selector-mes.component';

const ETIQUETAS_TIPO: Record<string, string> = {
  ausencia: 'Ausencia',
  problema_sitio: 'Problema en el sitio',
  otro: 'Otro',
};

const ETIQUETAS_ESTADO: Record<string, string> = {
  pendiente: 'Pendiente',
  revisada: 'Revisada',
  resuelta: 'Resuelta',
};

/** Fecha por la que se filtra y ordena: la del turno si está vinculado, si no la de cuando se reportó. */
function fechaEfectiva(i: Incidencia): string {
  return i.turno?.fecha ?? i.created_at.slice(0, 10);
}

@Component({
  selector: 'app-incidencias-jefe',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    SelectorMesComponent,
    FechaEsPipe,
  ],
  templateUrl: './incidencias-jefe.component.html',
  styleUrls: ['./incidencias-jefe.component.scss'],
})
export class IncidenciasJefeComponent implements OnInit {
  private readonly incidenciasService = inject(IncidenciasService);
  private readonly snackBar = inject(MatSnackBar);
  readonly authService = inject(AuthService);

  mes = mesActualIso();
  readonly incidencias = signal<Incidencia[]>([]);
  readonly loading = signal(true);
  readonly etiquetasTipo = ETIQUETAS_TIPO;
  readonly etiquetasEstado = ETIQUETAS_ESTADO;
  readonly columnas = ['empleado', 'fecha', 'puesto', 'tipo', 'descripcion', 'estado'];

  private todas: Incidencia[] = [];

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      this.todas = await this.incidenciasService.listar();
      this.filtrarPorMes();
    } finally {
      this.loading.set(false);
    }
  }

  onMesChange(nuevoMes: string): void {
    this.mes = nuevoMes;
    this.filtrarPorMes();
  }

  private filtrarPorMes(): void {
    const { desde, hasta } = rangoDelMes(this.mes);
    this.incidencias.set(
      this.todas
        .filter((i) => {
          const fecha = fechaEfectiva(i);
          return fecha >= desde && fecha <= hasta;
        })
        .sort((a, b) => fechaEfectiva(b).localeCompare(fechaEfectiva(a)))
    );
  }

  async cambiarEstado(incidencia: Incidencia, estado: EstadoIncidencia): Promise<void> {
    try {
      await this.incidenciasService.actualizarEstado(incidencia.id, estado);
      incidencia.estado = estado;
    } catch (err) {
      this.snackBar.open(err instanceof Error ? err.message : 'No se pudo actualizar la incidencia.', 'Cerrar', {
        duration: 5000,
      });
    }
  }
}
