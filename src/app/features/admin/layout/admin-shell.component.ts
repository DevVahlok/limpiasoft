import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AdminAuthService } from '../../../core/admin/admin-auth.service';

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

  readonly admin = this.adminAuthService.admin;

  readonly links = [
    { path: 'empresas', label: 'Empresas', icon: 'business' },
    { path: 'desarrolladores', label: 'Desarrolladores', icon: 'code' },
  ];

  async logout(): Promise<void> {
    await this.adminAuthService.logout();
    await this.router.navigateByUrl('/admin/login');
  }
}
