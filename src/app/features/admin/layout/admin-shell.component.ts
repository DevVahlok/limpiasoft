import { CommonModule } from '@angular/common';
import { Component, ViewChild, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AdminAuthService } from '../../../core/admin/admin-auth.service';
import { ResponsiveService } from '../../../core/layout/responsive.service';

@Component({
  selector: 'app-admin-shell',
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
  ],
  templateUrl: './admin-shell.component.html',
  styleUrls: ['./admin-shell.component.scss'],
})
export class AdminShellComponent {
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly router = inject(Router);
  readonly responsive = inject(ResponsiveService);

  @ViewChild(MatSidenav) sidenav!: MatSidenav;

  readonly admin = this.adminAuthService.admin;

  readonly links = [
    { path: 'empresas', label: 'Empresas', icon: 'business' },
    { path: 'ingresos', label: 'Ingresos', icon: 'payments' },
    { path: 'desarrolladores', label: 'Desarrolladores', icon: 'code' },
  ];

  cerrarSiEsMovil(): void {
    if (this.responsive.isHandset()) {
      void this.sidenav.close();
    }
  }

  async logout(): Promise<void> {
    await this.adminAuthService.logout();
    await this.router.navigateByUrl('/admin/login');
  }
}
