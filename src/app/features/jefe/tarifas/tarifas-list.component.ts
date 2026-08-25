import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { Profile } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { ResponsiveService } from '../../../core/layout/responsive.service';
import { FechaEsPipe } from '../../../shared/pipes/fecha-es.pipe';
import { EmpleadosService } from '../empleados/empleados.service';
import { HistorialTarifasComponent, HistorialTarifasData } from './historial-tarifas.component';
import { Tarifa } from '../../../core/tarifas/tarifa.models';
import { TarifaFormComponent, TarifaFormData } from './tarifa-form.component';
import { TarifasService } from '../../../core/tarifas/tarifas.service';

interface FilaTarifa {
  empleado: Profile;
  actual: Tarifa | null;
  historial: Tarifa[];
}

@Component({
  selector: 'app-tarifas-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    FechaEsPipe,
  ],
  templateUrl: './tarifas-list.component.html',
  styleUrls: ['./tarifas-list.component.scss'],
})
export class TarifasListComponent implements OnInit {
  private readonly empleadosService = inject(EmpleadosService);
  private readonly tarifasService = inject(TarifasService);
  private readonly dialog = inject(MatDialog);
  readonly authService = inject(AuthService);
  readonly responsive = inject(ResponsiveService);

  readonly filas = signal<FilaTarifa[]>([]);
  readonly loading = signal(true);
  readonly columnas = ['nombre', 'actual', 'vigenteDesde', 'acciones'];

  ngOnInit(): void {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    this.loading.set(true);
    try {
      const [empleados, tarifas] = await Promise.all([this.empleadosService.listar(), this.tarifasService.listar()]);
      this.filas.set(
        empleados.map((empleado) => {
          // tarifas ya viene ordenado por vigente_desde desc, así que la primera de cada empleado es la actual.
          const historial = tarifas.filter((t) => t.empleado_id === empleado.id);
          return { empleado, actual: historial[0] ?? null, historial };
        })
      );
    } finally {
      this.loading.set(false);
    }
  }

  abrirNuevaTarifa(fila: FilaTarifa): void {
    const ref = this.dialog.open<TarifaFormComponent, TarifaFormData, boolean>(TarifaFormComponent, {
      width: '380px',
      data: { empleadoId: fila.empleado.id, empleadoNombre: fila.empleado.nombre_completo },
    });

    ref.afterClosed().subscribe((guardado) => {
      if (guardado) {
        void this.cargar();
      }
    });
  }

  abrirHistorial(fila: FilaTarifa): void {
    this.dialog.open<HistorialTarifasComponent, HistorialTarifasData>(HistorialTarifasComponent, {
      width: '400px',
      data: { empleadoNombre: fila.empleado.nombre_completo, tarifas: fila.historial },
    });
  }
}
