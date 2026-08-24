import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';

import { Profile } from '../../../core/auth/auth.models';
import { EmpleadoFormComponent, EmpleadoFormResultado } from './empleado-form.component';
import { EmpleadosService } from './empleados.service';

@Component({
  selector: 'app-empleados-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './empleados-list.component.html',
  styleUrls: ['./empleados-list.component.scss'],
})
export class EmpleadosListComponent implements OnInit {
  private readonly empleadosService = inject(EmpleadosService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly empleados = signal<Profile[]>([]);
  readonly loading = signal(true);
  readonly columnas = ['nombre_completo', 'username', 'telefono', 'activo'];

  ngOnInit(): void {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    this.loading.set(true);
    try {
      this.empleados.set(await this.empleadosService.listar());
    } finally {
      this.loading.set(false);
    }
  }

  abrirFormulario(): void {
    const ref = this.dialog.open<EmpleadoFormComponent, void, EmpleadoFormResultado>(EmpleadoFormComponent, {
      width: '420px',
    });

    ref.afterClosed().subscribe((resultado) => {
      if (resultado) {
        this.snackBar.open(`Empleado creado. Usuario: ${resultado.username} (PIN inicial ya establecido)`, 'Cerrar', {
          duration: 15000,
        });
        void this.cargar();
      }
    });
  }
}
