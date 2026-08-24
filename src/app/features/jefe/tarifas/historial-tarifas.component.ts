import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

import { Tarifa } from '../../../core/tarifas/tarifa.models';
import { FechaEsPipe } from '../../../shared/pipes/fecha-es.pipe';

export interface HistorialTarifasData {
  empleadoNombre: string;
  tarifas: Tarifa[];
}

@Component({
  selector: 'app-historial-tarifas',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, FechaEsPipe],
  templateUrl: './historial-tarifas.component.html',
  styleUrls: ['./historial-tarifas.component.scss'],
})
export class HistorialTarifasComponent {
  readonly data = inject<HistorialTarifasData>(MAT_DIALOG_DATA);
}
