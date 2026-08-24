import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AdminDesarrolladoresService } from '../../../core/admin/admin-desarrolladores.service';
import { AppAdmin } from '../../../core/admin/admin.models';

export interface DesarrolladorFormData {
  desarrollador: AppAdmin | null;
}

@Component({
  selector: 'app-desarrollador-form',
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
  templateUrl: './desarrollador-form.component.html',
  styleUrls: ['./desarrollador-form.component.scss'],
})
export class DesarrolladorFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly desarrolladoresService = inject(AdminDesarrolladoresService);
  private readonly dialogRef = inject(MatDialogRef<DesarrolladorFormComponent, boolean>);
  private readonly data = inject<DesarrolladorFormData>(MAT_DIALOG_DATA);

  readonly esEdicion = !!this.data.desarrollador;

  readonly form = this.fb.nonNullable.group({
    nombreCompleto: [this.data.desarrollador?.nombre_completo ?? '', Validators.required],
    email: [this.data.desarrollador?.email ?? '', [Validators.required, Validators.email]],
    password: ['', this.esEdicion ? [] : [Validators.required, Validators.minLength(8)]],
  });

  guardando = false;
  errorMessage: string | null = null;

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    this.guardando = true;
    this.errorMessage = null;
    const { nombreCompleto, email, password } = this.form.getRawValue();
    try {
      if (this.data.desarrollador) {
        await this.desarrolladoresService.actualizar(this.data.desarrollador.id, nombreCompleto);
      } else {
        await this.desarrolladoresService.crear({ email, password, nombreCompleto });
      }
      this.dialogRef.close(true);
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'No se pudo guardar el desarrollador.';
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
