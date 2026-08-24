import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { IncidenciasService } from '../../../core/incidencias/incidencias.service';
import { TipoIncidencia } from '../../../core/incidencias/incidencia.models';
import { Turno } from '../../../core/turnos/turno.models';
import { TurnosService } from '../../../core/turnos/turnos.service';
import { FechaEsPipe } from '../../../shared/pipes/fecha-es.pipe';

export interface IncidenciaFormData {
  turno: Turno | null;
}

function aIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-incidencia-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    FechaEsPipe,
  ],
  templateUrl: './incidencia-form.component.html',
  styleUrls: ['./incidencia-form.component.scss'],
})
export class IncidenciaFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly incidenciasService = inject(IncidenciasService);
  private readonly turnosService = inject(TurnosService);
  private readonly dialogRef = inject(MatDialogRef<IncidenciaFormComponent, boolean>);
  private readonly data = inject<IncidenciaFormData>(MAT_DIALOG_DATA);

  turnos: Turno[] = [];
  cargandoTurnos = true;

  readonly form = this.fb.nonNullable.group({
    turno_id: [this.data.turno?.id ?? ''],
    tipo: ['problema_sitio' as TipoIncidencia, Validators.required],
    descripcion: ['', Validators.required],
  });

  guardando = false;
  errorMessage: string | null = null;

  async ngOnInit(): Promise<void> {
    try {
      const hoy = new Date();
      const desde = new Date(hoy);
      desde.setDate(desde.getDate() - 30);
      const hasta = new Date(hoy);
      hasta.setDate(hasta.getDate() + 7);
      const turnos = await this.turnosService.listarPorRango(aIso(desde), aIso(hasta));
      if (this.data.turno && !turnos.some((t) => t.id === this.data.turno!.id)) {
        turnos.unshift(this.data.turno);
      }
      this.turnos = turnos;
    } finally {
      this.cargandoTurnos = false;
    }
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    this.guardando = true;
    this.errorMessage = null;
    const { turno_id, tipo, descripcion } = this.form.getRawValue();
    try {
      await this.incidenciasService.crear({ turno_id: turno_id || undefined, tipo, descripcion });
      this.dialogRef.close(true);
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'No se pudo guardar la incidencia.';
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
