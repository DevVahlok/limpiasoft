import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { signal } from '@angular/core';

import { AppComponent } from './app.component';
import { AuthService } from './core/auth/auth.service';
import { Profile } from './core/auth/auth.models';

describe('AppComponent', () => {
  let profileSignal: ReturnType<typeof signal<Profile | null>>;
  let title: jasmine.SpyObj<Title>;

  beforeEach(() => {
    profileSignal = signal<Profile | null>(null);
    title = jasmine.createSpyObj('Title', ['setTitle']);
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: Title, useValue: title },
        { provide: AuthService, useValue: { profile: profileSignal } },
      ],
    });
  });

  it('se crea correctamente', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('pone el título genérico "Limpiasoft" cuando no hay perfil cargado', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(title.setTitle).toHaveBeenCalledWith('Limpiasoft');
  });

  it('pone "Limpiasoft - {empresa}" cuando el perfil tiene una empresa', () => {
    profileSignal.set({ empresa: { nombre: 'Limpiezas Acme', pausada: false } } as Profile);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(title.setTitle).toHaveBeenCalledWith('Limpiasoft - Limpiezas Acme');
  });

  it('actualiza el título si el perfil cambia después de crear el componente', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    title.setTitle.calls.reset();

    profileSignal.set({ empresa: { nombre: 'Otra Empresa', pausada: false } } as Profile);
    fixture.detectChanges();

    expect(title.setTitle).toHaveBeenCalledWith('Limpiasoft - Otra Empresa');
  });
});
