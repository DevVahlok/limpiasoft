import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { AuthService } from '../../core/auth/auth.service';
import { CambiarPinComponent } from './cambiar-pin.component';

describe('CambiarPinComponent', () => {
  let fixture: ComponentFixture<CambiarPinComponent>;
  let component: CambiarPinComponent;
  let cambiarPinSpy: jasmine.Spy;
  let dialogRef: jasmine.SpyObj<MatDialogRef<CambiarPinComponent, boolean>>;
  let perfil: { empresa: { pausada: boolean } | null };

  function crear() {
    perfil = { empresa: { pausada: false } };
    cambiarPinSpy = jasmine.createSpy('cambiarPin').and.resolveTo();
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [CambiarPinComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AuthService, useValue: { profile: () => perfil, cambiarPin: cambiarPinSpy } },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    });
    fixture = TestBed.createComponent(CambiarPinComponent);
    component = fixture.componentInstance;
  }

  function rellenar(nuevoPin: string, confirmarPin: string) {
    component.form.setValue({ nuevoPin, confirmarPin });
  }

  it('no hace nada si el formulario es inválido (PIN que no son 4 dígitos)', async () => {
    crear();
    rellenar('12', '12');

    await component.guardar();

    expect(cambiarPinSpy).not.toHaveBeenCalled();
  });

  it('muestra un error si los dos PIN no coinciden', async () => {
    crear();
    rellenar('1234', '5678');

    await component.guardar();

    expect(component.errorMessage).toBe('Los PIN no coinciden.');
    expect(cambiarPinSpy).not.toHaveBeenCalled();
  });

  it('impide cambiar el PIN si la empresa está pausada (modo solo lectura)', async () => {
    crear();
    perfil = { empresa: { pausada: true } };
    rellenar('1234', '1234');

    await component.guardar();

    expect(component.errorMessage).toBe('No puedes cambiar el PIN mientras la empresa esté en modo solo lectura.');
    expect(cambiarPinSpy).not.toHaveBeenCalled();
  });

  it('cambia el PIN y cierra el diálogo con true', async () => {
    crear();
    rellenar('1234', '1234');

    await component.guardar();

    expect(cambiarPinSpy).toHaveBeenCalledWith('1234');
    expect(dialogRef.close).toHaveBeenCalledWith(true);
    expect(component.guardando).toBe(false);
  });

  it('muestra un mensaje de error si falla el cambio de PIN y no cierra el diálogo', async () => {
    crear();
    rellenar('1234', '1234');
    cambiarPinSpy.and.callFake(() => Promise.reject(new Error('PIN usado recientemente')));

    await component.guardar();

    expect(component.errorMessage).toBe('PIN usado recientemente');
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.guardando).toBe(false);
  });

  it('cancelar cierra el diálogo con false', () => {
    crear();
    component.cancelar();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });
});
