import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { Tarifa } from '../../../core/tarifas/tarifa.models';
import { TarifasService } from '../../../core/tarifas/tarifas.service';
import { horasEntre, mesActualIso, rangoDelMes } from '../../../core/turnos/fecha.util';
import { Turno } from '../../../core/turnos/turno.models';
import { TurnosService } from '../../../core/turnos/turnos.service';
import { FechaEsPipe } from '../../../shared/pipes/fecha-es.pipe';
import { SelectorMesComponent } from '../../../shared/selector-mes/selector-mes.component';

@Component({
  selector: 'app-resumen-empleado',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatProgressSpinnerModule, SelectorMesComponent, FechaEsPipe],
  templateUrl: './resumen-empleado.component.html',
  styleUrls: ['./resumen-empleado.component.scss'],
})
export class ResumenEmpleadoComponent implements OnInit {
  private readonly turnosService = inject(TurnosService);
  private readonly tarifasService = inject(TarifasService);

  mes = mesActualIso();
  readonly loading = signal(true);
  readonly turnos = signal<Turno[]>([]);
  readonly horasPlanificadas = signal(0);
  readonly horasCompletadas = signal(0);
  readonly totalACobrar = signal(0);
  readonly previsionMes = signal(0);
  readonly columnas = ['fecha', 'puesto', 'horario', 'horas', 'estado', 'importe'];

  private tarifas: Tarifa[] = [];

  async ngOnInit(): Promise<void> {
    // RLS limita esta consulta a las propias tarifas del empleado.
    this.tarifas = await this.tarifasService.listar();
    await this.cargar();
  }

  horas(turno: Turno): number {
    return horasEntre(turno.hora_inicio, turno.hora_fin);
  }

  importe(turno: Turno): number | null {
    if (turno.estado !== 'completado') {
      return null;
    }
    const tarifa = this.tarifas.find((t) => t.vigente_desde <= turno.fecha);
    return tarifa ? horasEntre(turno.hora_inicio, turno.hora_fin) * tarifa.tarifa_hora : null;
  }

  /** Igual que importe(), pero también cuenta los turnos programados: sirve para la previsión del mes completo. */
  private importePotencial(turno: Turno): number {
    if (turno.estado === 'cancelado') {
      return 0;
    }
    const tarifa = this.tarifas.find((t) => t.vigente_desde <= turno.fecha);
    return tarifa ? horasEntre(turno.hora_inicio, turno.hora_fin) * tarifa.tarifa_hora : 0;
  }

  async onMesChange(nuevoMes: string): Promise<void> {
    this.mes = nuevoMes;
    await this.cargar();
  }

  private async cargar(): Promise<void> {
    this.loading.set(true);
    try {
      const { desde, hasta } = rangoDelMes(this.mes);
      const turnos = await this.turnosService.listarPorRango(desde, hasta);
      this.turnos.set(turnos);

      const horasDe = (estado: string) =>
        turnos.filter((t) => t.estado === estado).reduce((acc, t) => acc + horasEntre(t.hora_inicio, t.hora_fin), 0);

      this.horasPlanificadas.set(horasDe('programado'));
      this.horasCompletadas.set(horasDe('completado'));
      this.totalACobrar.set(turnos.reduce((acc, t) => acc + (this.importe(t) ?? 0), 0));
      this.previsionMes.set(turnos.reduce((acc, t) => acc + this.importePotencial(t), 0));
    } finally {
      this.loading.set(false);
    }
  }
}
