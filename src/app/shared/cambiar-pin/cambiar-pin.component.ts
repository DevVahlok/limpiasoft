import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-cambiar-pin',
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
  templateUrl: './cambiar-pin.component.html',
  styleUrls: ['./cambiar-pin.component.scss'],
})
export class CambiarPinComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly dialogRef = inject(MatDialogRef<CambiarPinComponent, boolean>);

  readonly form = this.fb.nonNullable.group({
    nuevoPin: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
    confirmarPin: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
  });

  guardando = false;
  errorMessage: string | null = null;

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    const { nuevoPin, confirmarPin } = this.form.getRawValue();
    if (nuevoPin !== confirmarPin) {
      this.errorMessage = 'Los PIN no coinciden.';
      return;
    }
    if (this.authService.profile()?.empresa?.pausada) {
      this.errorMessage = 'No puedes cambiar el PIN mientras la empresa esté en modo solo lectura.';
      return;
    }
    this.guardando = true;
    this.errorMessage = null;
    try {
      await this.authService.cambiarPin(nuevoPin);
      this.dialogRef.close(true);
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'No se pudo cambiar el PIN.';
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
