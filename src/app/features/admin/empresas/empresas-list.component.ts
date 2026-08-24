import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';

import { AdminEmpresasService } from '../../../core/admin/admin-empresas.service';
import { Empresa } from '../../../core/admin/admin.models';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { EmpresaFormComponent, EmpresaFormData } from './empresa-form.component';

@Component({
  selector: 'app-empresas-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
  ],
  templateUrl: './empresas-list.component.html',
  styleUrls: ['./empresas-list.component.scss'],
})
export class EmpresasListComponent implements OnInit {
  private readonly empresasService = inject(AdminEmpresasService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly empresas = signal<Empresa[]>([]);
  readonly loading = signal(true);
  readonly columnas = ['nombre', 'nif', 'estado', 'acciones'];

  ngOnInit(): void {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    this.loading.set(true);
    try {
      this.empresas.set(await this.empresasService.listar());
    } finally {
      this.loading.set(false);
    }
  }

  abrirFormulario(empresa: Empresa | null): void {
    const ref = this.dialog.open<EmpresaFormComponent, EmpresaFormData, boolean>(EmpresaFormComponent, {
      width: '420px',
      data: { empresa },
    });

    ref.afterClosed().subscribe((guardado) => {
      if (guardado) {
        void this.cargar();
      }
    });
  }

  verUsuarios(empresa: Empresa): void {
    void this.router.navigate(['/admin/empresas', empresa.id, 'usuarios']);
  }

  async cambiarPausa(empresa: Empresa): Promise<void> {
    try {
      await this.empresasService.cambiarPausa(empresa.id, !empresa.pausada);
      void this.cargar();
    } catch (err) {
      this.snackBar.open(err instanceof Error ? err.message : 'No se pudo actualizar la empresa.', 'Cerrar', {
        duration: 5000,
      });
    }
  }

  eliminar(empresa: Empresa): void {
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
      width: '420px',
      data: {
        titulo: 'Eliminar empresa',
        mensaje: `Se borrarán también todos sus usuarios, turnos, tarifas e incidencias. Esta acción no se puede deshacer.`,
        textoParaConfirmar: empresa.nombre,
      },
    });

    ref.afterClosed().subscribe(async (confirmado) => {
      if (!confirmado) return;
      try {
        await this.empresasService.eliminar(empresa.id);
        void this.cargar();
      } catch (err) {
        this.snackBar.open(err instanceof Error ? err.message : 'No se pudo eliminar la empresa.', 'Cerrar', {
          duration: 5000,
        });
      }
    });
  }
}
