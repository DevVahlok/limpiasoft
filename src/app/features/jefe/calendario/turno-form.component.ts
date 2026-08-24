import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { AuthService } from '../../../core/auth/auth.service';
import { EstadoTurno, Turno } from '../../../core/turnos/turno.models';
import { TurnosService } from '../../../core/turnos/turnos.service';
import { Profile } from '../../../core/auth/auth.models';
import { EmpleadosService } from '../empleados/empleados.service';
import { Puesto, PuestosService } from '../puestos/puestos.service';

export interface TurnoFormData {
  turno: Turno | null;
  fechaPredefinida?: string;
}

@Component({
  selector: 'app-turno-form',
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
  ],
  templateUrl: './turno-form.component.html',
  styleUrls: ['./turno-form.component.scss'],
})
export class TurnoFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly turnosService = inject(TurnosService);
  private readonly empleadosService = inject(EmpleadosService);
  private readonly puestosService = inject(PuestosService);
  private readonly authService = inject(AuthService);
  private readonly dialogRef = inject(MatDialogRef<TurnoFormComponent, boolean>);
  private readonly data = inject<TurnoFormData>(MAT_DIALOG_DATA);

  readonly esEdicion = !!this.data.turno;
  empleados: Profile[] = [];
  puestos: Puesto[] = [];
  cargandoListas = true;

  readonly form = this.fb.nonNullable.group({
    empleado_id: [this.data.turno?.empleado_id ?? '', Validators.required],
    puesto_id: [this.data.turno?.puesto_id ?? '', Validators.required],
    fecha: [this.data.turno?.fecha ?? this.data.fechaPredefinida ?? '', Validators.required],
    hora_inicio: [this.data.turno?.hora_inicio?.slice(0, 5) ?? '09:00', Validators.required],
    hora_fin: [this.data.turno?.hora_fin?.slice(0, 5) ?? '13:00', Validators.required],
    estado: [this.data.turno?.estado ?? ('programado' as EstadoTurno)],
    notas: [this.data.turno?.notas ?? ''],
  });

  guardando = false;
  errorMessage: string | null = null;

  async ngOnInit(): Promise<void> {
    try {
      const [empleados, puestos] = await Promise.all([this.empleadosService.listar(), this.puestosService.listar()]);
      this.empleados = empleados;
      this.puestos = puestos.filter((p) => p.activo || p.id === this.data.turno?.puesto_id);
    } finally {
      this.cargandoListas = false;
    }
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    const { empleado_id, puesto_id, fecha, hora_inicio, hora_fin, estado, notas } = this.form.getRawValue();
    if (hora_fin <= hora_inicio) {
      this.errorMessage = 'La hora de fin debe ser posterior a la de inicio.';
      return;
    }
    this.guardando = true;
    this.errorMessage = null;
    const input = { empleado_id, puesto_id, fecha, hora_inicio, hora_fin, notas: notas || undefined };
    try {
      if (this.data.turno) {
        await this.turnosService.actualizar(this.data.turno.id, { ...input, estado });
      } else {
        const empresaId = this.authService.profile()?.empresa_id;
        if (!empresaId) {
          throw new Error('Sesión no válida');
        }
        await this.turnosService.crear(input, empresaId);
      }
      this.dialogRef.close(true);
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'No se pudo guardar el turno.';
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
