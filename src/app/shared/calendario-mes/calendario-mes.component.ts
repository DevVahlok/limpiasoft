import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Turno } from '../../core/turnos/turno.models';

export interface RangoMes {
  desde: string;
  hasta: string;
  mesActual: Date;
}

interface DiaCelda {
  fecha: Date;
  iso: string;
  numero: number;
  enMesActual: boolean;
  esHoy: boolean;
  turnos: Turno[];
}

const NOMBRES_MES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const NOMBRES_DIA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function aIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

@Component({
  selector: 'app-calendario-mes',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './calendario-mes.component.html',
  styleUrls: ['./calendario-mes.component.scss'],
})
export class CalendarioMesComponent implements OnInit, OnChanges {
  @Input() turnos: Turno[] = [];
  /** true (jefe): chip muestra el empleado. false (empleado): chip muestra puesto + horario. */
  @Input() mostrarEmpleado = true;
  @Output() readonly diaClick = new EventEmitter<string>();
  @Output() readonly mesCambiado = new EventEmitter<RangoMes>();

  readonly nombresDia = NOMBRES_DIA;

  private mesActual = new Date();
  semanas: DiaCelda[][] = [];
  etiquetaMes = '';

  ngOnInit(): void {
    this.mesActual.setDate(1);
    this.recalcular(true);
  }

  ngOnChanges(): void {
    this.construirCeldas();
  }

  etiquetaChip(turno: Turno): string {
    if (this.mostrarEmpleado) {
      return turno.empleado?.nombre_completo || '—';
    }
    return `${turno.puesto?.nombre || '—'} · ${turno.hora_inicio.slice(0, 5)}-${turno.hora_fin.slice(0, 5)}`;
  }

  irMesAnterior(): void {
    this.mesActual.setMonth(this.mesActual.getMonth() - 1);
    this.recalcular(true);
  }

  irMesSiguiente(): void {
    this.mesActual.setMonth(this.mesActual.getMonth() + 1);
    this.recalcular(true);
  }

  irHoy(): void {
    this.mesActual = new Date();
    this.mesActual.setDate(1);
    this.recalcular(true);
  }

  private recalcular(emitirCambioMes: boolean): void {
    this.etiquetaMes = `${NOMBRES_MES[this.mesActual.getMonth()]} ${this.mesActual.getFullYear()}`;
    this.construirCeldas();
    if (emitirCambioMes) {
      const primerDiaCuadricula = this.semanas[0][0].fecha;
      const ultimaSemana = this.semanas[this.semanas.length - 1];
      const ultimoDiaCuadricula = ultimaSemana[ultimaSemana.length - 1].fecha;
      this.mesCambiado.emit({
        desde: aIso(primerDiaCuadricula),
        hasta: aIso(ultimoDiaCuadricula),
        mesActual: new Date(this.mesActual),
      });
    }
  }

  private construirCeldas(): void {
    const primerDiaMes = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth(), 1);
    const offsetLunes = (primerDiaMes.getDay() + 6) % 7;
    const inicioCuadricula = new Date(primerDiaMes);
    inicioCuadricula.setDate(inicioCuadricula.getDate() - offsetLunes);

    const turnosPorDia = new Map<string, Turno[]>();
    for (const turno of this.turnos) {
      const lista = turnosPorDia.get(turno.fecha) ?? [];
      lista.push(turno);
      turnosPorDia.set(turno.fecha, lista);
    }

    const hoyIso = aIso(new Date());
    const semanas: DiaCelda[][] = [];
    const cursor = new Date(inicioCuadricula);

    for (let semana = 0; semana < 6; semana++) {
      const fila: DiaCelda[] = [];
      for (let dia = 0; dia < 7; dia++) {
        const iso = aIso(cursor);
        fila.push({
          fecha: new Date(cursor),
          iso,
          numero: cursor.getDate(),
          enMesActual: cursor.getMonth() === this.mesActual.getMonth(),
          esHoy: iso === hoyIso,
          turnos: turnosPorDia.get(iso) ?? [],
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      semanas.push(fila);
    }
    this.semanas = semanas;
  }
}
