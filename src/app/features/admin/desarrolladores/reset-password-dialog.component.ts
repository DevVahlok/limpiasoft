import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AdminDesarrolladoresService } from '../../../core/admin/admin-desarrolladores.service';

export interface ResetPasswordDialogData {
  desarrolladorId: string;
  nombreCompleto: string;
}

@Component({
  selector: 'app-reset-password-dialog',
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
  templateUrl: './reset-password-dialog.component.html',
  styleUrls: ['./reset-password-dialog.component.scss'],
})
export class ResetPasswordDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly desarrolladoresService = inject(AdminDesarrolladoresService);
  private readonly dialogRef = inject(MatDialogRef<ResetPasswordDialogComponent, boolean>);
  readonly data = inject<ResetPasswordDialogData>(MAT_DIALOG_DATA);

  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  guardando = false;
  errorMessage: string | null = null;

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    this.guardando = true;
    this.errorMessage = null;
    try {
      await this.desarrolladoresService.resetearPassword(this.data.desarrolladorId, this.form.getRawValue().password);
      this.dialogRef.close(true);
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'No se pudo resetear la contraseña.';
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
