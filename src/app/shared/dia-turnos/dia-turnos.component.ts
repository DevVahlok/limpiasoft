import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { TurnosService } from '../../core/turnos/turnos.service';
import { Turno } from '../../core/turnos/turno.models';
import { FechaEsPipe } from '../pipes/fecha-es.pipe';

export interface DiaTurnosData {
  fecha: string;
  turnos: Turno[];
  soloLectura: boolean;
}

export interface DiaTurnosResultado {
  cambios: boolean;
  accion?: 'nuevo' | 'editar' | 'incidencia';
  turno?: Turno;
  fecha?: string;
}

const ETIQUETAS_ESTADO: Record<string, string> = {
  programado: 'Programado',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

@Component({
  selector: 'app-dia-turnos',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatSnackBarModule, FechaEsPipe],
  templateUrl: './dia-turnos.component.html',
  styleUrls: ['./dia-turnos.component.scss'],
})
export class DiaTurnosComponent {
  private readonly turnosService = inject(TurnosService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<DiaTurnosComponent, DiaTurnosResultado>);
  readonly data = inject<DiaTurnosData>(MAT_DIALOG_DATA);

  readonly etiquetasEstado = ETIQUETAS_ESTADO;
  turnos = [...this.data.turnos];
  private cambios = false;

  async eliminar(turno: Turno): Promise<void> {
    try {
      await this.turnosService.eliminar(turno.id);
      this.turnos = this.turnos.filter((t) => t.id !== turno.id);
      this.cambios = true;
    } catch (err) {
      this.snackBar.open(err instanceof Error ? err.message : 'No se pudo eliminar el turno.', 'Cerrar', {
        duration: 5000,
      });
    }
  }

  nuevoTurno(): void {
    this.dialogRef.close({ cambios: this.cambios, accion: 'nuevo', fecha: this.data.fecha });
  }

  editarTurno(turno: Turno): void {
    this.dialogRef.close({ cambios: this.cambios, accion: 'editar', turno });
  }

  reportarIncidencia(turno: Turno): void {
    this.dialogRef.close({ cambios: this.cambios, accion: 'incidencia', turno });
  }

  cerrar(): void {
    this.dialogRef.close({ cambios: this.cambios });
  }
}
