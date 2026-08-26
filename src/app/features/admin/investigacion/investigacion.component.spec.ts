import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { AdminProspectosService } from '../../../core/admin/admin-prospectos.service';
import { Prospecto } from '../../../core/admin/admin.models';
import { CIUDADES } from '../../../core/admin/ciudades';
import { InvestigacionComponent } from './investigacion.component';

// Nota importante: este componente crea un mapa de Leaflet real en
// ngAfterViewInit() (L.map('mapa-investigacion')). Ese hook solo se dispara
// con fixture.detectChanges(), así que estos tests NUNCA llaman a
// detectChanges(): se crea el componente con TestBed.createComponent() y se
// invocan a mano ngOnInit() y el resto de métodos públicos. Como el mapa
// (this.map) se queda a null, solo se prueba la lógica propia del
// componente que no depende de que el mapa exista de verdad (ver uso de
// `this.map?...` con optional chaining en el propio componente), tal y como
// se verificó manualmente con Playwright que el mapa en sí renderiza bien.
function prospecto(overrides: Partial<Prospecto> = {}): Prospecto {
  return {
    id: 'pr1',
    nombre: 'Prospecto 1',
    ciudad: CIUDADES[0].nombre,
    direccion: 'Calle Falsa 123',
    telefono: '600000000',
    web: null,
    notas: null,
    lat: 36.68,
    lng: -6.13,
    created_at: '2026-01-01',
    ...overrides,
  };
}

describe('InvestigacionComponent', () => {
  let fixture: ComponentFixture<InvestigacionComponent>;
  let component: InvestigacionComponent;
  let prospectosService: jasmine.SpyObj<AdminProspectosService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  function crear(prospectos: Prospecto[]) {
    prospectosService = jasmine.createSpyObj('AdminProspectosService', ['listarPorCiudad', 'eliminar']);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    prospectosService.listarPorCiudad.and.resolveTo(prospectos);

    TestBed.configureTestingModule({
      imports: [InvestigacionComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AdminProspectosService, useValue: prospectosService },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    TestBed.overrideComponent(InvestigacionComponent, {
      add: { providers: [{ provide: MatDialog, useValue: dialog }, { provide: MatSnackBar, useValue: snackBar }] },
    });
    fixture = TestBed.createComponent(InvestigacionComponent);
    component = fixture.componentInstance;
    // Deliberadamente NO se llama a fixture.detectChanges() aquí: eso
    // dispararía ngAfterViewInit() y el L.map() real de Leaflet.
  }

  it('arranca con la primera ciudad de la lista seleccionada', () => {
    crear([]);
    expect(component.ciudadSeleccionada()).toBe(CIUDADES[0].nombre);
  });

  it('ngOnInit() carga los prospectos de la ciudad seleccionada', async () => {
    crear([prospecto()]);

    component.ngOnInit();
    await fixture.whenStable();

    expect(prospectosService.listarPorCiudad).toHaveBeenCalledWith(CIUDADES[0].nombre);
    expect(component.prospectos().length).toBe(1);
    expect(component.loading()).toBe(false);
  });

  describe('onCiudadChange', () => {
    it('cambia la ciudad seleccionada y recarga los prospectos de la nueva ciudad', async () => {
      crear([]);
      const otraCiudad = CIUDADES[1].nombre;
      prospectosService.listarPorCiudad.and.resolveTo([prospecto({ ciudad: otraCiudad })]);

      await component.onCiudadChange(otraCiudad);

      expect(component.ciudadSeleccionada()).toBe(otraCiudad);
      expect(prospectosService.listarPorCiudad).toHaveBeenCalledWith(otraCiudad);
      expect(component.prospectos().length).toBe(1);
    });

    it('no falla aunque el mapa todavía no exista (this.map es null en el test)', async () => {
      crear([]);
      await expectAsync(component.onCiudadChange(CIUDADES[2].nombre)).toBeResolved();
    });
  });

  describe('abrirFormulario', () => {
    it('abre el formulario de prospecto con la ciudad actual y sin lat/lng cuando se llama sin coordenadas', () => {
      crear([]);
      dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);

      component.abrirFormulario(null);

      expect(dialog.open).toHaveBeenCalledWith(
        jasmine.any(Function),
        jasmine.objectContaining({ data: { prospecto: null, ciudad: CIUDADES[0].nombre, lat: undefined, lng: undefined } })
      );
    });

    it('pasa lat/lng cuando se abre desde un clic en el mapa', () => {
      crear([]);
      dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);

      component.abrirFormulario(null, 36.5, -6.2);

      expect(dialog.open).toHaveBeenCalledWith(
        jasmine.any(Function),
        jasmine.objectContaining({ data: jasmine.objectContaining({ lat: 36.5, lng: -6.2 }) })
      );
    });

    it('recarga la lista de prospectos si el formulario se guarda', async () => {
      crear([]);
      dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);

      component.abrirFormulario(prospecto());
      await fixture.whenStable();

      expect(prospectosService.listarPorCiudad).toHaveBeenCalled();
    });

    it('no recarga si se cancela el formulario', () => {
      crear([]);
      prospectosService.listarPorCiudad.calls.reset();
      dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);

      component.abrirFormulario(null);

      expect(prospectosService.listarPorCiudad).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('pide confirmación con el nombre del prospecto y, al confirmar, elimina y recarga', async () => {
      const p = prospecto({ nombre: 'A Borrar' });
      crear([p]);
      dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);
      prospectosService.eliminar.and.resolveTo();

      component.eliminar(p);
      await fixture.whenStable();

      expect(dialog.open).toHaveBeenCalledWith(
        jasmine.any(Function),
        jasmine.objectContaining({ data: jasmine.objectContaining({ mensaje: jasmine.stringContaining('A Borrar') }) })
      );
      expect(prospectosService.eliminar).toHaveBeenCalledWith('pr1');
    });

    it('no elimina si se cancela la confirmación', async () => {
      const p = prospecto();
      crear([p]);
      dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);

      component.eliminar(p);
      await fixture.whenStable();

      expect(prospectosService.eliminar).not.toHaveBeenCalled();
    });

    it('muestra un snackbar si falla la eliminación', async () => {
      const p = prospecto();
      crear([p]);
      dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);
      prospectosService.eliminar.and.callFake(() => Promise.reject(new Error('no se pudo eliminar')));

      component.eliminar(p);
      await fixture.whenStable();

      expect(snackBar.open).toHaveBeenCalledWith('no se pudo eliminar', 'Cerrar', { duration: 5000 });
    });
  });

  it('ngOnDestroy() no falla aunque el mapa nunca se haya inicializado', () => {
    crear([]);
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
