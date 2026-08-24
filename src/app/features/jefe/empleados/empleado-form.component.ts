import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { CrearEmpleadoResultado, EmpleadosService } from './empleados.service';

export type EmpleadoFormResultado = CrearEmpleadoResultado;

@Component({
  selector: 'app-empleado-form',
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
  templateUrl: './empleado-form.component.html',
  styleUrls: ['./empleado-form.component.scss'],
})
export class EmpleadoFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly empleadosService = inject(EmpleadosService);
  private readonly dialogRef = inject(MatDialogRef<EmpleadoFormComponent, EmpleadoFormResultado>);

  readonly form = this.fb.nonNullable.group({
    nombreCompleto: ['', Validators.required],
    telefono: [''],
    tarifaHora: [10, [Validators.required, Validators.min(0)]],
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
    const { nombreCompleto, telefono, tarifaHora, pin } = this.form.getRawValue();
    try {
      const resultado = await this.empleadosService.crear({
        nombreCompleto,
        telefono: telefono || undefined,
        tarifaHora,
        pin,
      });
      this.dialogRef.close(resultado);
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'No se pudo crear el empleado.';
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}
