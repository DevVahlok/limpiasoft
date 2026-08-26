import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { AdminProspectosService } from '../../../core/admin/admin-prospectos.service';
import { Prospecto } from '../../../core/admin/admin.models';
import { CIUDADES } from '../../../core/admin/ciudades';

export interface ProspectoFormData {
  prospecto: Prospecto | null;
  ciudad: string;
  lat?: number;
  lng?: number;
}

@Component({
  selector: 'app-prospecto-form',
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
  templateUrl: './prospecto-form.component.html',
  styleUrls: ['./prospecto-form.component.scss'],
})
export class ProspectoFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly prospectosService = inject(AdminProspectosService);
  private readonly dialogRef = inject(MatDialogRef<ProspectoFormComponent, boolean>);
  readonly data = inject<ProspectoFormData>(MAT_DIALOG_DATA);

  readonly ciudades = CIUDADES;
  readonly esEdicion = !!this.data.prospecto;

  readonly form = this.fb.nonNullable.group({
    nombre: [this.data.prospecto?.nombre ?? '', Validators.required],
    ciudad: [this.data.prospecto?.ciudad ?? this.data.ciudad, Validators.required],
    direccion: [this.data.prospecto?.direccion ?? ''],
    telefono: [this.data.prospecto?.telefono ?? ''],
    web: [this.data.prospecto?.web ?? ''],
    notas: [this.data.prospecto?.notas ?? ''],
    lat: [this.data.prospecto?.lat ?? this.data.lat ?? null],
    lng: [this.data.prospecto?.lng ?? this.data.lng ?? null],
  });

  guardando = false;
  errorMessage: string | null = null;

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    this.guardando = true;
    this.errorMessage = null;
    const { nombre, ciudad, direccion, telefono, web, notas, lat, lng } = this.form.getRawValue();
    const params = {
      nombre,
      ciudad,
      direccion: direccion || undefined,
      telefono: telefono || undefined,
      web: web || undefined,
      notas: notas || undefined,
      lat: lat ?? undefined,
      lng: lng ?? undefined,
    };
    try {
      if (this.data.prospecto) {
        await this.prospectosService.actualizar(this.data.prospecto.id, params);
      } else {
        await this.prospectosService.crear(params);
      }
      this.dialogRef.close(true);
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'No se pudo guardar el prospecto.';
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
