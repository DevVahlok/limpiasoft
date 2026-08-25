import { CommonModule } from '@angular/common';
import { Component, ViewChild, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { ResponsiveService } from '../../../core/layout/responsive.service';
import { CambiarPinComponent } from '../../../shared/cambiar-pin/cambiar-pin.component';

@Component({
  selector: 'app-empleado-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
  ],
  templateUrl: './empleado-shell.component.html',
  styleUrls: ['./empleado-shell.component.scss'],
})
export class EmpleadoShellComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  readonly responsive = inject(ResponsiveService);

  @ViewChild(MatSidenav) sidenav!: MatSidenav;

  readonly profile = this.authService.profile;

  readonly links = [
    { path: 'calendario', label: 'Mi calendario', icon: 'calendar_month' },
    { path: 'incidencias', label: 'Incidencias', icon: 'report_problem' },
    { path: 'resumen', label: 'Mi resumen', icon: 'summarize' },
  ];

  cambiarPin(): void {
    this.dialog.open(CambiarPinComponent, { width: '360px' });
  }

  cerrarSiEsMovil(): void {
    if (this.responsive.isTabletOrHandset()) {
      void this.sidenav.close();
    }
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigateByUrl('/login');
  }
}
