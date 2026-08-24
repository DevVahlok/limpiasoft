import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { Turno } from '../../../core/turnos/turno.models';
import { TurnosService } from '../../../core/turnos/turnos.service';
import { CalendarioMesComponent, RangoMes } from '../../../shared/calendario-mes/calendario-mes.component';
import { DiaTurnosComponent, DiaTurnosResultado } from '../../../shared/dia-turnos/dia-turnos.component';
import { TurnoFormComponent, TurnoFormData } from './turno-form.component';

@Component({
  selector: 'app-calendario-jefe',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule, CalendarioMesComponent],
  templateUrl: './calendario-jefe.component.html',
  styleUrls: ['./calendario-jefe.component.scss'],
})
export class CalendarioJefeComponent {
  private readonly turnosService = inject(TurnosService);
  private readonly dialog = inject(MatDialog);

  readonly turnos = signal<Turno[]>([]);
  private rango: RangoMes | null = null;

  async onMesCambiado(rango: RangoMes): Promise<void> {
    this.rango = rango;
    await this.recargar();
  }

  private async recargar(): Promise<void> {
    if (!this.rango) {
      return;
    }
    this.turnos.set(await this.turnosService.listarPorRango(this.rango.desde, this.rango.hasta));
  }

  abrirNuevoTurno(): void {
    this.abrirFormulario({ turno: null });
  }

  onDiaClick(fecha: string): void {
    const turnosDelDia = this.turnos().filter((t) => t.fecha === fecha);
    const ref = this.dialog.open<DiaTurnosComponent, unknown, DiaTurnosResultado>(DiaTurnosComponent, {
      width: '480px',
      data: { fecha, turnos: turnosDelDia, soloLectura: false },
    });

    ref.afterClosed().subscribe((resultado) => {
      if (!resultado) {
        return;
      }
      if (resultado.accion === 'nuevo') {
        this.abrirFormulario({ turno: null, fechaPredefinida: resultado.fecha });
      } else if (resultado.accion === 'editar' && resultado.turno) {
        this.abrirFormulario({ turno: resultado.turno });
      } else if (resultado.cambios) {
        void this.recargar();
      }
    });
  }

  private abrirFormulario(data: TurnoFormData): void {
    const ref = this.dialog.open<TurnoFormComponent, TurnoFormData, boolean>(TurnoFormComponent, {
      width: '420px',
      data,
    });

    ref.afterClosed().subscribe((guardado) => {
      if (guardado) {
        void this.recargar();
      }
    });
  }
}
