import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

import { Profile } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { Turno } from '../../../core/turnos/turno.models';
import { TurnosService } from '../../../core/turnos/turnos.service';
import { CalendarioMesComponent, RangoMes } from '../../../shared/calendario-mes/calendario-mes.component';
import { DiaTurnosComponent, DiaTurnosResultado } from '../../../shared/dia-turnos/dia-turnos.component';
import { EmpleadosService } from '../empleados/empleados.service';
import { TurnoFormComponent, TurnoFormData } from './turno-form.component';

@Component({
  selector: 'app-calendario-jefe',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    CalendarioMesComponent,
  ],
  templateUrl: './calendario-jefe.component.html',
  styleUrls: ['./calendario-jefe.component.scss'],
})
export class CalendarioJefeComponent implements OnInit {
  private readonly turnosService = inject(TurnosService);
  private readonly empleadosService = inject(EmpleadosService);
  private readonly dialog = inject(MatDialog);
  readonly authService = inject(AuthService);

  readonly turnos = signal<Turno[]>([]);
  readonly empleados = signal<Profile[]>([]);
  readonly empleadoSeleccionado = signal('');
  readonly turnosFiltrados = computed(() => {
    const empleadoId = this.empleadoSeleccionado();
    return empleadoId ? this.turnos().filter((t) => t.empleado_id === empleadoId) : this.turnos();
  });
  private rango: RangoMes | null = null;

  async ngOnInit(): Promise<void> {
    this.empleados.set(await this.empleadosService.listar());
  }

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
    const turnosDelDia = this.turnosFiltrados().filter((t) => t.fecha === fecha);
    const ref = this.dialog.open<DiaTurnosComponent, unknown, DiaTurnosResultado>(DiaTurnosComponent, {
      width: '480px',
      data: { fecha, turnos: turnosDelDia, soloLectura: false, pausada: this.authService.empresaPausada() },
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
