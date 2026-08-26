import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { Incidencia } from '../../../core/incidencias/incidencia.models';
import { IncidenciasService } from '../../../core/incidencias/incidencias.service';
import { IncidenciaFormComponent } from './incidencia-form.component';
import { IncidenciasEmpleadoComponent } from './incidencias-empleado.component';

function incidencia(overrides: Partial<Incidencia>): Incidencia {
  return {
    id: 'i1',
    empresa_id: 'empresa-1',
    turno_id: null,
    empleado_id: 'e1',
    tipo: 'otro',
    descripcion: 'algo',
    estado: 'pendiente',
    created_at: '2026-08-01T10:00:00Z',
    empleado: null,
    turno: null,
    ...overrides,
  };
}

describe('IncidenciasEmpleadoComponent', () => {
  let fixture: ComponentFixture<IncidenciasEmpleadoComponent>;
  let component: IncidenciasEmpleadoComponent;
  let incidenciasService: jasmine.SpyObj<IncidenciasService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  function crear() {
    incidenciasService = jasmine.createSpyObj('IncidenciasService', ['listar']);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    incidenciasService.listar.and.resolveTo([]);

    TestBed.configureTestingModule({
      imports: [IncidenciasEmpleadoComponent],
      providers: [
        provideNoopAnimations(),
        { provide: IncidenciasService, useValue: incidenciasService },
        { provide: MatDialog, useValue: dialog },
      ],
    });
    TestBed.overrideComponent(IncidenciasEmpleadoComponent, {
      add: { providers: [{ provide: MatDialog, useValue: dialog }] },
    });
    fixture = TestBed.createComponent(IncidenciasEmpleadoComponent);
    component = fixture.componentInstance;
  }

  it('cargar() activa loading al empezar y lo desactiva al terminar, con la lista recibida', async () => {
    crear();
    incidenciasService.listar.and.resolveTo([incidencia({ id: 'i1' })]);

    const promesa = component.cargar();
    expect(component.loading()).toBe(true);
    await promesa;

    expect(component.loading()).toBe(false);
    expect(component.incidencias()).toEqual([incidencia({ id: 'i1' })]);
  });

  it('ngOnInit dispara la carga inicial de incidencias', () => {
    crear();
    incidenciasService.listar.and.resolveTo([incidencia({ id: 'i1' })]);

    component.ngOnInit();

    expect(incidenciasService.listar).toHaveBeenCalled();
  });

  describe('abrirFormulario', () => {
    it('abre el formulario de nueva incidencia sin turno preasociado', () => {
      crear();
      dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);

      component.abrirFormulario();

      expect(dialog.open).toHaveBeenCalledWith(IncidenciaFormComponent, { width: '440px', data: { turno: null } });
    });

    it('si el formulario se guarda, recarga la lista de incidencias', async () => {
      crear();
      await component.cargar();
      incidenciasService.listar.calls.reset();
      incidenciasService.listar.and.resolveTo([incidencia({ id: 'nueva' })]);
      dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);

      component.abrirFormulario();
      await fixture.whenStable();

      expect(incidenciasService.listar).toHaveBeenCalled();
      expect(component.incidencias()).toEqual([incidencia({ id: 'nueva' })]);
    });

    it('si se cancela el formulario, no recarga la lista', async () => {
      crear();
      await component.cargar();
      incidenciasService.listar.calls.reset();
      dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);

      component.abrirFormulario();
      await fixture.whenStable();

      expect(incidenciasService.listar).not.toHaveBeenCalled();
    });
  });
});
