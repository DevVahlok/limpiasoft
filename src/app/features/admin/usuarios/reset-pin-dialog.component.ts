import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AdminUsuariosService } from '../../../core/admin/admin-usuarios.service';
import { PinInputComponent } from '../../../shared/pin-input/pin-input.component';

export interface ResetPinDialogData {
  usuarioId: string;
  nombreCompleto: string;
}

@Component({
  selector: 'app-reset-pin-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    PinInputComponent,
  ],
  templateUrl: './reset-pin-dialog.component.html',
  styleUrls: ['./reset-pin-dialog.component.scss'],
})
export class ResetPinDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly usuariosService = inject(AdminUsuariosService);
  private readonly dialogRef = inject(MatDialogRef<ResetPinDialogComponent, boolean>);
  readonly data = inject<ResetPinDialogData>(MAT_DIALOG_DATA);

  readonly form = this.fb.nonNullable.group({
    pin: ['0000', [Validators.required, Validators.pattern(/^\d{4}$/)]],
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
      await this.usuariosService.resetearPin(this.data.usuarioId, this.form.getRawValue().pin);
      this.dialogRef.close(true);
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'No se pudo resetear el PIN.';
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
