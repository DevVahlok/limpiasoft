import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AdminEmpresasService } from '../../../core/admin/admin-empresas.service';
import { Empresa } from '../../../core/admin/admin.models';

export interface EmpresaFormData {
  empresa: Empresa | null;
}

@Component({
  selector: 'app-empresa-form',
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
  templateUrl: './empresa-form.component.html',
  styleUrls: ['./empresa-form.component.scss'],
})
export class EmpresaFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly empresasService = inject(AdminEmpresasService);
  private readonly dialogRef = inject(MatDialogRef<EmpresaFormComponent, boolean>);
  private readonly data = inject<EmpresaFormData>(MAT_DIALOG_DATA);

  readonly esEdicion = !!this.data.empresa;

  readonly form = this.fb.nonNullable.group({
    nombre: [this.data.empresa?.nombre ?? '', Validators.required],
    nif: [this.data.empresa?.nif ?? ''],
  });

  guardando = false;
  errorMessage: string | null = null;

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    this.guardando = true;
    this.errorMessage = null;
    const { nombre, nif } = this.form.getRawValue();
    const input = { nombre, nif: nif || undefined };
    try {
      if (this.data.empresa) {
        await this.empresasService.actualizar(this.data.empresa.id, input);
      } else {
        await this.empresasService.crear(input);
      }
      this.dialogRef.close(true);
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'No se pudo guardar la empresa.';
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
