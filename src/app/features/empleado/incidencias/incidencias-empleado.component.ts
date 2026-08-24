import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Incidencia } from '../../../core/incidencias/incidencia.models';
import { IncidenciasService } from '../../../core/incidencias/incidencias.service';
import { FechaEsPipe } from '../../../shared/pipes/fecha-es.pipe';
import { IncidenciaFormComponent, IncidenciaFormData } from './incidencia-form.component';

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

@Component({
  selector: 'app-incidencias-empleado',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule, MatProgressSpinnerModule, FechaEsPipe],
  templateUrl: './incidencias-empleado.component.html',
  styleUrls: ['./incidencias-empleado.component.scss'],
})
export class IncidenciasEmpleadoComponent implements OnInit {
  private readonly incidenciasService = inject(IncidenciasService);
  private readonly dialog = inject(MatDialog);

  readonly incidencias = signal<Incidencia[]>([]);
  readonly loading = signal(true);
  readonly etiquetasTipo = ETIQUETAS_TIPO;
  readonly etiquetasEstado = ETIQUETAS_ESTADO;

  ngOnInit(): void {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    this.loading.set(true);
    try {
      this.incidencias.set(await this.incidenciasService.listar());
    } finally {
      this.loading.set(false);
    }
  }

  abrirFormulario(): void {
    const ref = this.dialog.open<IncidenciaFormComponent, IncidenciaFormData, boolean>(IncidenciaFormComponent, {
      width: '440px',
      data: { turno: null },
    });

    ref.afterClosed().subscribe((guardado) => {
      if (guardado) {
        void this.cargar();
      }
    });
  }
}
