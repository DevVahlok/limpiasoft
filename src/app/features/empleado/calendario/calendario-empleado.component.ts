import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { Turno } from '../../../core/turnos/turno.models';
import { TurnosService } from '../../../core/turnos/turnos.service';
import { CalendarioMesComponent, RangoMes } from '../../../shared/calendario-mes/calendario-mes.component';
import { DiaTurnosComponent, DiaTurnosResultado } from '../../../shared/dia-turnos/dia-turnos.component';
import { IncidenciaFormComponent, IncidenciaFormData } from '../incidencias/incidencia-form.component';

@Component({
  selector: 'app-calendario-empleado',
  standalone: true,
  imports: [CommonModule, MatDialogModule, CalendarioMesComponent],
  templateUrl: './calendario-empleado.component.html',
  styleUrls: ['./calendario-empleado.component.scss'],
})
export class CalendarioEmpleadoComponent {
  private readonly turnosService = inject(TurnosService);
  private readonly dialog = inject(MatDialog);

  readonly turnos = signal<Turno[]>([]);
  private rango: RangoMes | null = null;

  async onMesCambiado(rango: RangoMes): Promise<void> {
    this.rango = rango;
    if (!this.rango) {
      return;
    }
    this.turnos.set(await this.turnosService.listarPorRango(this.rango.desde, this.rango.hasta));
  }

  onDiaClick(fecha: string): void {
    const turnosDelDia = this.turnos().filter((t) => t.fecha === fecha);
    const ref = this.dialog.open<DiaTurnosComponent, unknown, DiaTurnosResultado>(DiaTurnosComponent, {
      width: '480px',
      data: { fecha, turnos: turnosDelDia, soloLectura: true },
    });

    ref.afterClosed().subscribe((resultado) => {
      if (resultado?.accion === 'incidencia' && resultado.turno) {
        this.dialog.open<IncidenciaFormComponent, IncidenciaFormData, boolean>(IncidenciaFormComponent, {
          width: '440px',
          data: { turno: resultado.turno },
        });
      }
    });
  }
}
