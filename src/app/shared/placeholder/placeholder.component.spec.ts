import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { PlaceholderComponent } from './placeholder.component';

describe('PlaceholderComponent', () => {
  let fixture: ComponentFixture<PlaceholderComponent>;
  let component: PlaceholderComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PlaceholderComponent],
      providers: [provideNoopAnimations()],
    });
    fixture = TestBed.createComponent(PlaceholderComponent);
    component = fixture.componentInstance;
  });

  it('usa "Próximamente" como título por defecto', () => {
    expect(component.title).toBe('Próximamente');
  });

  it('renderiza el título recibido por @Input', () => {
    component.title = 'Informes';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2').textContent).toContain('Informes');
  });
});
