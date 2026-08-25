import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';

import { AdminAuthService } from '../../../core/admin/admin-auth.service';
import { AdminDesarrolladoresService } from '../../../core/admin/admin-desarrolladores.service';
import { AppAdmin } from '../../../core/admin/admin.models';
import { ResponsiveService } from '../../../core/layout/responsive.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { DesarrolladorFormComponent, DesarrolladorFormData } from './desarrollador-form.component';
import { ResetPasswordDialogComponent, ResetPasswordDialogData } from './reset-password-dialog.component';

@Component({
  selector: 'app-desarrolladores-list',
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
  templateUrl: './desarrolladores-list.component.html',
  styleUrls: ['./desarrolladores-list.component.scss'],
})
export class DesarrolladoresListComponent implements OnInit {
  private readonly desarrolladoresService = inject(AdminDesarrolladoresService);
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  readonly responsive = inject(ResponsiveService);

  readonly desarrolladores = signal<AppAdmin[]>([]);
  readonly loading = signal(true);
  readonly columnas = ['nombre_completo', 'email', 'acciones'];

  get miPropioId(): string | undefined {
    return this.adminAuthService.admin()?.id;
  }

  ngOnInit(): void {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    this.loading.set(true);
    try {
      this.desarrolladores.set(await this.desarrolladoresService.listar());
    } finally {
      this.loading.set(false);
    }
  }

  abrirFormulario(desarrollador: AppAdmin | null): void {
    const ref = this.dialog.open<DesarrolladorFormComponent, DesarrolladorFormData, boolean>(
      DesarrolladorFormComponent,
      { width: '420px', data: { desarrollador } },
    );

    ref.afterClosed().subscribe((guardado) => {
      if (guardado) {
        void this.cargar();
      }
    });
  }

  resetearPassword(desarrollador: AppAdmin): void {
    const ref = this.dialog.open<ResetPasswordDialogComponent, ResetPasswordDialogData, boolean>(
      ResetPasswordDialogComponent,
      { width: '360px', data: { desarrolladorId: desarrollador.id, nombreCompleto: desarrollador.nombre_completo } },
    );

    ref.afterClosed().subscribe((hecho) => {
      if (hecho) {
        this.snackBar.open('Contraseña actualizada.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  eliminar(desarrollador: AppAdmin): void {
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
      width: '420px',
      data: {
        titulo: 'Eliminar desarrollador',
        mensaje: `Se borrará la cuenta de acceso de ${desarrollador.nombre_completo}.`,
      },
    });

    ref.afterClosed().subscribe(async (confirmado) => {
      if (!confirmado) return;
      try {
        await this.desarrolladoresService.eliminar(desarrollador.id);
        void this.cargar();
      } catch (err) {
        this.snackBar.open(err instanceof Error ? err.message : 'No se pudo eliminar el desarrollador.', 'Cerrar', {
          duration: 5000,
        });
      }
    });
  }
}
