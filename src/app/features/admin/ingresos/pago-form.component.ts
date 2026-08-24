import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { AdminPagosService } from '../../../core/admin/admin-pagos.service';
import { Empresa, Pago } from '../../../core/admin/admin.models';

export interface PagoFormData {
  pago: Pago | null;
  empresas: Empresa[];
}

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

@Component({
  selector: 'app-pago-form',
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
  templateUrl: './pago-form.component.html',
  styleUrls: ['./pago-form.component.scss'],
})
export class PagoFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly pagosService = inject(AdminPagosService);
  private readonly dialogRef = inject(MatDialogRef<PagoFormComponent, boolean>);
  readonly data = inject<PagoFormData>(MAT_DIALOG_DATA);

  readonly esEdicion = !!this.data.pago;

  readonly form = this.fb.nonNullable.group({
    empresaId: [{ value: this.data.pago?.empresa_id ?? '', disabled: this.esEdicion }, Validators.required],
    importe: [this.data.pago?.importe ?? 60, [Validators.required, Validators.min(0)]],
    fecha: [this.data.pago?.fecha?.slice(0, 10) ?? hoyIso(), Validators.required],
    notas: [this.data.pago?.notas ?? ''],
  });

  guardando = false;
  errorMessage: string | null = null;

  onEmpresaSeleccionada(empresaId: string): void {
    const empresa = this.data.empresas.find((e) => e.id === empresaId);
    if (empresa) {
      this.form.controls.importe.setValue(empresa.precio_mensual);
    }
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    this.guardando = true;
    this.errorMessage = null;
    const { empresaId, importe, fecha, notas } = this.form.getRawValue();
    try {
      if (this.data.pago) {
        await this.pagosService.actualizar(this.data.pago.id, { importe, fecha, notas: notas || undefined });
      } else {
        await this.pagosService.crear({ empresaId, importe, fecha, notas: notas || undefined });
      }
      this.dialogRef.close(true);
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'No se pudo guardar el pago.';
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
