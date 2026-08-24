import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    pin: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
  });

  loading = false;
  errorMessage: string | null = null;

  async submit(): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    this.errorMessage = null;
    const { username, pin } = this.form.getRawValue();
    try {
      await this.authService.login(username, pin);
      const profile = this.authService.profile();
      await this.router.navigateByUrl(profile?.rol === 'jefe' ? '/jefe' : '/empleado');
    } catch {
      this.errorMessage = 'Usuario o PIN incorrectos.';
    } finally {
      this.loading = false;
    }
  }
}
