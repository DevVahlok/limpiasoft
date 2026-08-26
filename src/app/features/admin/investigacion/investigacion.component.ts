import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, NgZone, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import * as L from 'leaflet';

import { AdminProspectosService } from '../../../core/admin/admin-prospectos.service';
import { Prospecto } from '../../../core/admin/admin.models';
import { CIUDADES, Ciudad } from '../../../core/admin/ciudades';
import { ResponsiveService } from '../../../core/layout/responsive.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { ProspectoFormComponent, ProspectoFormData } from './prospecto-form.component';

// El icono por defecto de Leaflet referencia rutas relativas que se rompen
// al empaquetar con Angular; se sustituyen por las copiadas a assets/leaflet
// (ver angular.json).
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconUrl: 'assets/leaflet/marker-icon.png',
  shadowUrl: 'assets/leaflet/marker-shadow.png',
});

@Component({
  selector: 'app-investigacion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTableModule,
  ],
  templateUrl: './investigacion.component.html',
  styleUrls: ['./investigacion.component.scss'],
})
export class InvestigacionComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly prospectosService = inject(AdminProspectosService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly zone = inject(NgZone);
  readonly responsive = inject(ResponsiveService);

  readonly ciudades = CIUDADES;
  readonly ciudadSeleccionada = signal(CIUDADES[0].nombre);
  readonly prospectos = signal<Prospecto[]>([]);
  readonly loading = signal(true);
  readonly columnas = ['nombre', 'direccion', 'telefono', 'acciones'];

  private map: L.Map | null = null;
  private marcadores: L.Marker[] = [];

  ngOnInit(): void {
    void this.cargar();
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => this.inicializarMapa());
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private inicializarMapa(): void {
    const ciudad = this.ciudadActual();
    this.map = L.map('mapa-investigacion').setView([ciudad.lat, ciudad.lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.zone.run(() => this.abrirFormulario(null, e.latlng.lat, e.latlng.lng));
    });
    this.pintarMarcadores();

    // Al crearse justo después de renderizar la vista, el contenedor a veces
    // todavía no tiene su tamaño final; se recalcula una vez asentado el layout.
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  private ciudadActual(): Ciudad {
    return this.ciudades.find((c) => c.nombre === this.ciudadSeleccionada()) ?? this.ciudades[0];
  }

  async onCiudadChange(nombre: string): Promise<void> {
    this.ciudadSeleccionada.set(nombre);
    const ciudad = this.ciudadActual();
    this.map?.setView([ciudad.lat, ciudad.lng], 13);
    await this.cargar();
  }

  private async cargar(): Promise<void> {
    this.loading.set(true);
    try {
      this.prospectos.set(await this.prospectosService.listarPorCiudad(this.ciudadSeleccionada()));
      this.pintarMarcadores();
    } finally {
      this.loading.set(false);
    }
  }

  private pintarMarcadores(): void {
    if (!this.map) return;
    this.marcadores.forEach((m) => m.remove());
    this.marcadores = [];
    for (const p of this.prospectos()) {
      if (p.lat == null || p.lng == null) continue;
      const marker = L.marker([p.lat, p.lng]).addTo(this.map);
      marker.bindPopup(this.crearContenidoPopup(p));
      this.marcadores.push(marker);
    }
  }

  private crearContenidoPopup(p: Prospecto): HTMLElement {
    const div = document.createElement('div');

    const titulo = document.createElement('strong');
    titulo.textContent = p.nombre;
    div.appendChild(titulo);

    if (p.direccion) {
      const dir = document.createElement('div');
      dir.textContent = p.direccion;
      div.appendChild(dir);
    }
    if (p.telefono) {
      const tel = document.createElement('div');
      tel.textContent = `Tel: ${p.telefono}`;
      div.appendChild(tel);
    }
    if (p.web) {
      const web = document.createElement('a');
      web.href = p.web.startsWith('http') ? p.web : `https://${p.web}`;
      web.target = '_blank';
      web.rel = 'noopener noreferrer';
      web.textContent = p.web;
      div.appendChild(web);
    }
    return div;
  }

  abrirFormulario(prospecto: Prospecto | null, lat?: number, lng?: number): void {
    const ref = this.dialog.open<ProspectoFormComponent, ProspectoFormData, boolean>(ProspectoFormComponent, {
      width: '420px',
      data: { prospecto, ciudad: this.ciudadSeleccionada(), lat, lng },
    });

    ref.afterClosed().subscribe((guardado) => {
      if (guardado) {
        void this.cargar();
      }
    });
  }

  eliminar(prospecto: Prospecto): void {
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
      width: '400px',
      data: { titulo: 'Eliminar prospecto', mensaje: `Se borrará "${prospecto.nombre}" de la lista.` },
    });

    ref.afterClosed().subscribe(async (confirmado) => {
      if (!confirmado) return;
      try {
        await this.prospectosService.eliminar(prospecto.id);
        void this.cargar();
      } catch (err) {
        this.snackBar.open(err instanceof Error ? err.message : 'No se pudo eliminar el prospecto.', 'Cerrar', {
          duration: 5000,
        });
      }
    });
  }
}
