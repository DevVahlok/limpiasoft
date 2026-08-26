import { Component, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';

import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  private readonly titleService = inject(Title);
  private readonly authService = inject(AuthService);

  constructor() {
    effect(() => {
      const nombreEmpresa = this.authService.profile()?.empresa?.nombre;
      this.titleService.setTitle(nombreEmpresa ? `Limpiasoft - ${nombreEmpresa}` : 'Limpiasoft');
    });
  }
}
