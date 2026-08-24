import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { Profile } from '../../../core/auth/auth.models';
import { AdminUsuariosService } from '../../../core/admin/admin-usuarios.service';

export interface UsuarioFormData {
  empresaId: string;
  usuario: Profile | null;
}

@Component({
  selector: 'app-usuario-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './usuario-form.component.html',
  styleUrls: ['./usuario-form.component.scss'],
})
export class UsuarioFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly usuariosService = inject(AdminUsuariosService);
  private readonly dialogRef = inject(MatDialogRef<UsuarioFormComponent, boolean>);
  private readonly data = inject<UsuarioFormData>(MAT_DIALOG_DATA);

  readonly esEdicion = !!this.data.usuario;

  readonly form = this.fb.nonNullable.group({
    rol: [this.data.usuario?.rol ?? ('empleado' as 'empleado' | 'jefe'), Validators.required],
    nombreCompleto: [this.data.usuario?.nombre_completo ?? '', Validators.required],
    telefono: [this.data.usuario?.telefono ?? ''],
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
    const { rol, nombreCompleto, telefono, pin } = this.form.getRawValue();
    try {
      if (this.data.usuario) {
        await this.usuariosService.actualizar(this.data.usuario.id, {
          rol,
          nombreCompleto,
          telefono: telefono || undefined,
        });
      } else {
        await this.usuariosService.crear({
          empresaId: this.data.empresaId,
          rol,
          nombreCompleto,
          telefono: telefono || undefined,
          pin,
        });
      }
      this.dialogRef.close(true);
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'No se pudo guardar el usuario.';
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
