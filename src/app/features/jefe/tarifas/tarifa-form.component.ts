import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TarifasService } from '../../../core/tarifas/tarifas.service';

export interface TarifaFormData {
  empleadoId: string;
  empleadoNombre: string;
}

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

@Component({
  selector: 'app-tarifa-form',
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
  templateUrl: './tarifa-form.component.html',
  styleUrls: ['./tarifa-form.component.scss'],
})
export class TarifaFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly tarifasService = inject(TarifasService);
  private readonly dialogRef = inject(MatDialogRef<TarifaFormComponent, boolean>);
  readonly data = inject<TarifaFormData>(MAT_DIALOG_DATA);

  readonly form = this.fb.nonNullable.group({
    tarifa_hora: [10, [Validators.required, Validators.min(0)]],
    vigente_desde: [hoyIso(), Validators.required],
  });

  guardando = false;
  errorMessage: string | null = null;

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    this.guardando = true;
    this.errorMessage = null;
    const { tarifa_hora, vigente_desde } = this.form.getRawValue();
    try {
      await this.tarifasService.crear({ empleado_id: this.data.empleadoId, tarifa_hora, vigente_desde });
      this.dialogRef.close(true);
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'No se pudo guardar la tarifa.';
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
