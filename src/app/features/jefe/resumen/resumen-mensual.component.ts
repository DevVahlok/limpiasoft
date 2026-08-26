import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';

import { AuthService } from '../../../core/auth/auth.service';
import { Profile } from '../../../core/auth/auth.models';
import { ResponsiveService } from '../../../core/layout/responsive.service';
import { PagosNominaService } from '../../../core/nomina/pagos-nomina.service';
import { Tarifa } from '../../../core/tarifas/tarifa.models';
import { TarifasService } from '../../../core/tarifas/tarifas.service';
import { horasEntre, mesActualIso, rangoDelMes } from '../../../core/turnos/fecha.util';
import { Turno } from '../../../core/turnos/turno.models';
import { TurnosService } from '../../../core/turnos/turnos.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { SelectorMesComponent } from '../../../shared/selector-mes/selector-mes.component';
import { EmpleadosService } from '../empleados/empleados.service';
import { DetalleResumenComponent, DetalleResumenData } from './detalle-resumen.component';

export interface DetalleTurno {
  turno: Turno;
  horas: number;
  tarifaHora: number | null;
  importe: number;
}

interface FilaResumen {
  empleado: Profile;
  horas: number;
  importe: number;
  previsionImporte: number;
  detalle: DetalleTurno[];
  pagoId: string | null;
}

function importePorTarifaVigente(tarifasEmpleado: Tarifa[], turno: Turno): number {
  const tarifa = tarifasEmpleado.find((t) => t.vigente_desde <= turno.fecha);
  return tarifa ? horasEntre(turno.hora_inicio, turno.hora_fin) * tarifa.tarifa_hora : 0;
}

@Component({
  selector: 'app-resumen-mensual',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    SelectorMesComponent,
  ],
  templateUrl: './resumen-mensual.component.html',
  styleUrls: ['./resumen-mensual.component.scss'],
})
export class ResumenMensualComponent implements OnInit {
  private readonly empleadosService = inject(EmpleadosService);
  private readonly turnosService = inject(TurnosService);
  private readonly tarifasService = inject(TarifasService);
  private readonly pagosNominaService = inject(PagosNominaService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  readonly responsive = inject(ResponsiveService);
  readonly authService = inject(AuthService);

  mes = mesActualIso();
  readonly filas = signal<FilaResumen[]>([]);
  readonly loading = signal(true);
  readonly columnas = ['nombre', 'horas', 'prevision', 'importe', 'pagado', 'acciones'];
  readonly totalImporte = signal(0);
  readonly totalPrevision = signal(0);

  private empleados: Profile[] = [];
  private tarifas: Tarifa[] = [];

  async ngOnInit(): Promise<void> {
    this.empleados = await this.empleadosService.listar();
    this.tarifas = await this.tarifasService.listar();
    await this.recalcular();
  }

  async onMesChange(nuevoMes: string): Promise<void> {
    this.mes = nuevoMes;
    this.loading.set(true);
    await this.recalcular();
  }

  private async recalcular(): Promise<void> {
    this.loading.set(true);
    try {
      const { desde, hasta } = rangoDelMes(this.mes);
      const [todosTurnos, pagosNomina] = await Promise.all([
        this.turnosService.listarPorRango(desde, hasta),
        this.pagosNominaService.listarPorMes(this.mes),
      ]);
      const turnosCompletados = todosTurnos.filter((t) => t.estado === 'completado');
      // La previsión asume que también se completan los turnos aún programados (las incidencias cancelan el turno).
      const turnosPrevision = todosTurnos.filter((t) => t.estado !== 'cancelado');

      const filas = this.empleados.map((empleado): FilaResumen => {
        const tarifasEmpleado = this.tarifas.filter((t) => t.empleado_id === empleado.id);
        const detalle: DetalleTurno[] = turnosCompletados
          .filter((t) => t.empleado_id === empleado.id)
          .map((turno) => {
            const tarifa = tarifasEmpleado.find((t) => t.vigente_desde <= turno.fecha) ?? null;
            const horas = horasEntre(turno.hora_inicio, turno.hora_fin);
            const importe = tarifa ? horas * tarifa.tarifa_hora : 0;
            return { turno, horas, tarifaHora: tarifa?.tarifa_hora ?? null, importe };
          });

        const previsionImporte = turnosPrevision
          .filter((t) => t.empleado_id === empleado.id)
          .reduce((acc, turno) => acc + importePorTarifaVigente(tarifasEmpleado, turno), 0);

        return {
          empleado,
          horas: detalle.reduce((acc, d) => acc + d.horas, 0),
          importe: detalle.reduce((acc, d) => acc + d.importe, 0),
          previsionImporte,
          detalle,
          pagoId: pagosNomina.find((p) => p.empleado_id === empleado.id)?.id ?? null,
        };
      });

      this.filas.set(filas);
      this.totalImporte.set(filas.reduce((acc, f) => acc + f.importe, 0));
      this.totalPrevision.set(filas.reduce((acc, f) => acc + f.previsionImporte, 0));
    } finally {
      this.loading.set(false);
    }
  }

  verDetalle(fila: FilaResumen): void {
    this.dialog.open<DetalleResumenComponent, DetalleResumenData>(DetalleResumenComponent, {
      width: '900px',
      maxWidth: '95vw',
      data: { empleadoNombre: fila.empleado.nombre_completo, detalle: fila.detalle },
    });
  }

  async marcarPagado(fila: FilaResumen): Promise<void> {
    const empresaId = this.authService.profile()?.empresa_id;
    if (!empresaId) {
      return;
    }
    try {
      const pago = await this.pagosNominaService.marcarPagado(empresaId, fila.empleado.id, this.mes);
      this.filas.update((filas) => filas.map((f) => (f === fila ? { ...f, pagoId: pago.id } : f)));
    } catch (err) {
      this.snackBar.open(err instanceof Error ? err.message : 'No se pudo marcar como pagado.', 'Cerrar', {
        duration: 5000,
      });
    }
  }

  desmarcarPagado(fila: FilaResumen): void {
    if (!fila.pagoId) {
      return;
    }
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
      width: '400px',
      data: {
        titulo: 'Desmarcar como pagado',
        mensaje: `¿Seguro que quieres desmarcar a ${fila.empleado.nombre_completo} como pagado este mes?`,
      },
    });

    ref.afterClosed().subscribe(async (confirmado) => {
      if (!confirmado || !fila.pagoId) {
        return;
      }
      try {
        await this.pagosNominaService.desmarcarPagado(fila.pagoId);
        this.filas.update((filas) => filas.map((f) => (f === fila ? { ...f, pagoId: null } : f)));
      } catch (err) {
        this.snackBar.open(err instanceof Error ? err.message : 'No se pudo desmarcar el pago.', 'Cerrar', {
          duration: 5000,
        });
      }
    });
  }
}
