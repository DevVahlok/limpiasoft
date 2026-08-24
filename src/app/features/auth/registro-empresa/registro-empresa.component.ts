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
  selector: 'app-registro-empresa',
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
  templateUrl: './registro-empresa.component.html',
  styleUrls: ['./registro-empresa.component.scss'],
})
export class RegistroEmpresaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    nombreEmpresa: ['', Validators.required],
    nombreCompleto: ['', Validators.required],
    pin: ['0000', [Validators.required, Validators.pattern(/^\d{4}$/)]],
  });

  loading = false;
  errorMessage: string | null = null;

  async submit(): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    this.errorMessage = null;
    const { nombreEmpresa, nombreCompleto, pin } = this.form.getRawValue();
    try {
      await this.authService.signUpEmpresa({ nombreEmpresa, nombreCompleto, pin });
      await this.router.navigateByUrl('/jefe');
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'No se pudo completar el registro.';
    } finally {
      this.loading = false;
    }
  }
}
