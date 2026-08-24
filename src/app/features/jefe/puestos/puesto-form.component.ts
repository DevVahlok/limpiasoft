import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Puesto, PuestosService } from './puestos.service';

export interface PuestoFormData {
  puesto: Puesto | null;
}

@Component({
  selector: 'app-puesto-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './puesto-form.component.html',
  styleUrls: ['./puesto-form.component.scss'],
})
export class PuestoFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly puestosService = inject(PuestosService);
  private readonly dialogRef = inject(MatDialogRef<PuestoFormComponent, boolean>);
  private readonly data = inject<PuestoFormData>(MAT_DIALOG_DATA);

  readonly esEdicion = !!this.data.puesto;

  readonly form = this.fb.nonNullable.group({
    nombre: [this.data.puesto?.nombre ?? '', Validators.required],
    direccion: [this.data.puesto?.direccion ?? ''],
    notas: [this.data.puesto?.notas ?? ''],
  });

  guardando = false;
  errorMessage: string | null = null;

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    this.guardando = true;
    this.errorMessage = null;
    const { nombre, direccion, notas } = this.form.getRawValue();
    const input = { nombre, direccion: direccion || undefined, notas: notas || undefined };
    try {
      if (this.data.puesto) {
        await this.puestosService.actualizar(this.data.puesto.id, input);
      } else {
        await this.puestosService.crear(input);
      }
      this.dialogRef.close(true);
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'No se pudo guardar el puesto.';
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
