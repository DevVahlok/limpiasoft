import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';

import { PuestoFormComponent } from './puesto-form.component';
import { Puesto, PuestosService } from './puestos.service';

@Component({
  selector: 'app-puestos-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatSnackBarModule,
  ],
  templateUrl: './puestos-list.component.html',
  styleUrls: ['./puestos-list.component.scss'],
})
export class PuestosListComponent implements OnInit {
  private readonly puestosService = inject(PuestosService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly puestos = signal<Puesto[]>([]);
  readonly loading = signal(true);
  readonly columnas = ['nombre', 'direccion', 'activo', 'acciones'];

  ngOnInit(): void {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    this.loading.set(true);
    try {
      this.puestos.set(await this.puestosService.listar());
    } finally {
      this.loading.set(false);
    }
  }

  abrirFormulario(puesto: Puesto | null): void {
    const ref = this.dialog.open<PuestoFormComponent, { puesto: Puesto | null }, boolean>(PuestoFormComponent, {
      width: '420px',
      data: { puesto },
    });

    ref.afterClosed().subscribe((guardado) => {
      if (guardado) {
        void this.cargar();
      }
    });
  }

  async cambiarActivo(puesto: Puesto): Promise<void> {
    try {
      await this.puestosService.cambiarActivo(puesto.id, !puesto.activo);
      void this.cargar();
    } catch (err) {
      this.snackBar.open(err instanceof Error ? err.message : 'No se pudo actualizar el puesto.', 'Cerrar', {
        duration: 5000,
      });
    }
  }
}
