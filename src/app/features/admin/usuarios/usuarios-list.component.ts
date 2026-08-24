import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';

import { AdminEmpresasService } from '../../../core/admin/admin-empresas.service';
import { AdminUsuariosService } from '../../../core/admin/admin-usuarios.service';
import { Profile } from '../../../core/auth/auth.models';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { ResetPinDialogComponent, ResetPinDialogData } from './reset-pin-dialog.component';
import { UsuarioFormComponent, UsuarioFormData } from './usuario-form.component';

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatSnackBarModule,
  ],
  templateUrl: './usuarios-list.component.html',
  styleUrls: ['./usuarios-list.component.scss'],
})
export class UsuariosListComponent implements OnInit {
  @Input() empresaId!: string;

  private readonly usuariosService = inject(AdminUsuariosService);
  private readonly empresasService = inject(AdminEmpresasService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly usuarios = signal<Profile[]>([]);
  readonly nombreEmpresa = signal('');
  readonly loading = signal(true);
  readonly columnas = ['nombre_completo', 'rol', 'username', 'telefono', 'activo', 'acciones'];

  ngOnInit(): void {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    this.loading.set(true);
    try {
      const [usuarios, empresas] = await Promise.all([
        this.usuariosService.listar(this.empresaId),
        this.empresasService.listar(),
      ]);
      this.usuarios.set(usuarios);
      this.nombreEmpresa.set(empresas.find((e) => e.id === this.empresaId)?.nombre ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  abrirFormulario(usuario: Profile | null): void {
    const ref = this.dialog.open<UsuarioFormComponent, UsuarioFormData, boolean>(UsuarioFormComponent, {
      width: '420px',
      data: { empresaId: this.empresaId, usuario },
    });

    ref.afterClosed().subscribe((guardado) => {
      if (guardado) {
        void this.cargar();
      }
    });
  }

  resetearPin(usuario: Profile): void {
    const ref = this.dialog.open<ResetPinDialogComponent, ResetPinDialogData, boolean>(ResetPinDialogComponent, {
      width: '360px',
      data: { usuarioId: usuario.id, nombreCompleto: usuario.nombre_completo },
    });

    ref.afterClosed().subscribe((hecho) => {
      if (hecho) {
        this.snackBar.open('PIN actualizado.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  async cambiarActivo(usuario: Profile): Promise<void> {
    try {
      await this.usuariosService.actualizar(usuario.id, { activo: !usuario.activo });
      void this.cargar();
    } catch (err) {
      this.snackBar.open(err instanceof Error ? err.message : 'No se pudo actualizar el usuario.', 'Cerrar', {
        duration: 5000,
      });
    }
  }

  eliminar(usuario: Profile): void {
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
      width: '420px',
      data: {
        titulo: 'Eliminar usuario',
        mensaje: `Se borrará la cuenta de ${usuario.nombre_completo} (${usuario.username}) y todo lo asociado a ella (turnos, tarifas, incidencias).`,
      },
    });

    ref.afterClosed().subscribe(async (confirmado) => {
      if (!confirmado) return;
      try {
        await this.usuariosService.eliminar(usuario.id);
        void this.cargar();
      } catch (err) {
        this.snackBar.open(err instanceof Error ? err.message : 'No se pudo eliminar el usuario.', 'Cerrar', {
          duration: 5000,
        });
      }
    });
  }
}
