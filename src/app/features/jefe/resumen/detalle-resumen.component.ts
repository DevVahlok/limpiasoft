import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';

import { FechaEsPipe } from '../../../shared/pipes/fecha-es.pipe';
import { DetalleTurno } from './resumen-mensual.component';

export interface DetalleResumenData {
  empleadoNombre: string;
  detalle: DetalleTurno[];
}

@Component({
  selector: 'app-detalle-resumen',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatTableModule, FechaEsPipe],
  templateUrl: './detalle-resumen.component.html',
  styleUrls: ['./detalle-resumen.component.scss'],
})
export class DetalleResumenComponent {
  readonly data = inject<DetalleResumenData>(MAT_DIALOG_DATA);
  readonly columnas = ['fecha', 'puesto', 'horario', 'horas', 'tarifa', 'importe'];
}
