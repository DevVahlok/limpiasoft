import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';

import { AdminEmpresasService } from '../../../core/admin/admin-empresas.service';
import { AdminPagosService } from '../../../core/admin/admin-pagos.service';
import { Empresa, Pago } from '../../../core/admin/admin.models';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { FechaEsPipe } from '../../../shared/pipes/fecha-es.pipe';
import { PagoFormComponent, PagoFormData } from './pago-form.component';

@Component({
  selector: 'app-ingresos',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTableModule,
    FechaEsPipe,
  ],
  templateUrl: './ingresos.component.html',
  styleUrls: ['./ingresos.component.scss'],
})
export class IngresosComponent implements OnInit {
  private readonly empresasService = inject(AdminEmpresasService);
  private readonly pagosService = inject(AdminPagosService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly empresas = signal<Empresa[]>([]);
  readonly pagos = signal<Pago[]>([]);
  readonly loading = signal(true);
  readonly columnasPagos = ['fecha', 'empresa', 'importe', 'notas', 'acciones'];

  readonly activas = computed(() => this.empresas().filter((e) => !e.pausada));
  readonly pausadas = computed(() => this.empresas().filter((e) => e.pausada));
  readonly ingresoProyectado = computed(() => this.activas().reduce((suma, e) => suma + e.precio_mensual, 0));
  readonly precioMedio = computed(() => (this.activas().length ? this.ingresoProyectado() / this.activas().length : 0));

  readonly ingresosEsteMes = computed(() => {
    const mesActual = new Date().toISOString().slice(0, 7);
    return this.pagos()
      .filter((p) => p.fecha.slice(0, 7) === mesActual)
      .reduce((suma, p) => suma + p.importe, 0);
  });

  readonly porcentajeActivas = computed(() => {
    const total = this.empresas().length;
    return total ? (this.activas().length / total) * 100 : 0;
  });

  readonly donutGradient = computed(() => {
    const pct = this.porcentajeActivas();
    return `conic-gradient(#1e7e34 0 ${pct}%, #e0e0e0 ${pct}% 100%)`;
  });

  readonly barrasProyeccion = computed(() => {
    const max = Math.max(...this.activas().map((e) => e.precio_mensual), 1);
    return [...this.activas()]
      .sort((a, b) => b.precio_mensual - a.precio_mensual)
      .map((e) => ({ nombre: e.nombre, importe: e.precio_mensual, porcentaje: (e.precio_mensual / max) * 100 }));
  });

  readonly barrasMensuales = computed(() => {
    const meses: { clave: string; etiqueta: string; total: number }[] = [];
    const hoy = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const etiqueta = d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
      meses.push({ clave, etiqueta, total: 0 });
    }
    for (const pago of this.pagos()) {
      const mes = meses.find((m) => m.clave === pago.fecha.slice(0, 7));
      if (mes) {
        mes.total += pago.importe;
      }
    }
    const max = Math.max(...meses.map((m) => m.total), 1);
    return meses.map((m) => ({ ...m, porcentaje: (m.total / max) * 100 }));
  });

  ngOnInit(): void {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    this.loading.set(true);
    try {
      const [empresas, pagos] = await Promise.all([this.empresasService.listar(), this.pagosService.listar()]);
      this.empresas.set(empresas);
      this.pagos.set(pagos);
    } finally {
      this.loading.set(false);
    }
  }

  abrirFormulario(pago: Pago | null): void {
    const ref = this.dialog.open<PagoFormComponent, PagoFormData, boolean>(PagoFormComponent, {
      width: '420px',
      data: { pago, empresas: this.empresas() },
    });

    ref.afterClosed().subscribe((guardado) => {
      if (guardado) {
        void this.cargar();
      }
    });
  }

  eliminar(pago: Pago): void {
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
      width: '400px',
      data: {
        titulo: 'Eliminar pago',
        mensaje: `Se borrará el pago de ${pago.importe} € de ${pago.empresa?.nombre ?? 'esta empresa'}.`,
      },
    });

    ref.afterClosed().subscribe(async (confirmado) => {
      if (!confirmado) return;
      try {
        await this.pagosService.eliminar(pago.id);
        void this.cargar();
      } catch (err) {
        this.snackBar.open(err instanceof Error ? err.message : 'No se pudo eliminar el pago.', 'Cerrar', {
          duration: 5000,
        });
      }
    });
  }
}
