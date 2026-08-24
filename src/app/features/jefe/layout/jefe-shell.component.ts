import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { CambiarPinComponent } from '../../../shared/cambiar-pin/cambiar-pin.component';

@Component({
  selector: 'app-jefe-shell',
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
  templateUrl: './jefe-shell.component.html',
  styleUrls: ['./jefe-shell.component.scss'],
})
export class JefeShellComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  readonly profile = this.authService.profile;

  readonly links = [
    { path: 'empleados', label: 'Empleados', icon: 'group' },
    { path: 'puestos', label: 'Puestos de trabajo', icon: 'location_on' },
    { path: 'calendario', label: 'Calendario', icon: 'calendar_month' },
    { path: 'tarifas', label: 'Tarifas', icon: 'payments' },
    { path: 'resumen', label: 'Resumen mensual', icon: 'summarize' },
  ];

  cambiarPin(): void {
    this.dialog.open(CambiarPinComponent, { width: '360px' });
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigateByUrl('/login');
  }
}
