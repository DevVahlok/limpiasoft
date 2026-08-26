import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let component: ConfirmDialogComponent;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ConfirmDialogComponent>>;

  function crear(data: ConfirmDialogData) {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    });
    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('sin texto de confirmación, se puede confirmar directamente', () => {
    crear({ titulo: 'Eliminar', mensaje: '¿Seguro?' });
    expect(component.puedeConfirmar).toBe(true);
  });

  it('confirmar() cierra el diálogo con `true`', () => {
    crear({ titulo: 'Eliminar', mensaje: '¿Seguro?' });
    component.confirmar();
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('cancelar() cierra el diálogo con `false`', () => {
    crear({ titulo: 'Eliminar', mensaje: '¿Seguro?' });
    component.cancelar();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });

  describe('con texto de confirmación requerido', () => {
    beforeEach(() => {
      crear({ titulo: 'Eliminar empresa', mensaje: '¿Seguro?', textoParaConfirmar: 'Empresa Prueba' });
    });

    it('no se puede confirmar mientras el texto no coincide', () => {
      component.textoEscrito = 'texto incorrecto';
      expect(component.puedeConfirmar).toBe(false);
    });

    it('se puede confirmar cuando el texto escrito coincide exactamente', () => {
      component.textoEscrito = 'Empresa Prueba';
      expect(component.puedeConfirmar).toBe(true);
    });

    it('no se puede confirmar con una coincidencia parcial', () => {
      component.textoEscrito = 'Empresa';
      expect(component.puedeConfirmar).toBe(false);
    });
  });
});
