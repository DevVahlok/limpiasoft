import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { mesActualIso } from '../../core/turnos/fecha.util';

const NOMBRES_MES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

@Component({
  selector: 'app-selector-mes',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './selector-mes.component.html',
  styleUrls: ['./selector-mes.component.scss'],
})
export class SelectorMesComponent implements OnInit, OnChanges {
  @Input() mes = mesActualIso();
  @Output() readonly mesChange = new EventEmitter<string>();

  etiqueta = '';

  ngOnInit(): void {
    this.actualizarEtiqueta();
  }

  ngOnChanges(): void {
    this.actualizarEtiqueta();
  }

  irMesAnterior(): void {
    this.desplazar(-1);
  }

  irMesSiguiente(): void {
    this.desplazar(1);
  }

  irHoy(): void {
    const actual = mesActualIso();
    if (actual !== this.mes) {
      this.mes = actual;
      this.mesChange.emit(this.mes);
    }
    this.actualizarEtiqueta();
  }

  private desplazar(delta: number): void {
    const [anio, mesNum] = this.mes.split('-').map(Number);
    const fecha = new Date(anio, mesNum - 1 + delta, 1);
    this.mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    this.mesChange.emit(this.mes);
    this.actualizarEtiqueta();
  }

  private actualizarEtiqueta(): void {
    const [anio, mesNum] = this.mes.split('-').map(Number);
    this.etiqueta = `${NOMBRES_MES[mesNum - 1]} ${anio}`;
  }
}
