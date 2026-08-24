import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [MatCardModule, MatIconModule],
  template: `
    <mat-card class="placeholder-card">
      <mat-icon>construction</mat-icon>
      <h2>{{ title }}</h2>
      <p>Esta sección estará disponible próximamente.</p>
    </mat-card>
  `,
  styles: [
    `
      .placeholder-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        max-width: 420px;
        margin: 48px auto;
        padding: 32px;
        text-align: center;
      }

      mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        color: #9e9e9e;
      }
    `,
  ],
})
export class PlaceholderComponent {
  @Input() title = 'Próximamente';
}
