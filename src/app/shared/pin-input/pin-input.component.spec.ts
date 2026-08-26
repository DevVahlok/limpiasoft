import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PinInputComponent } from './pin-input.component';

describe('PinInputComponent', () => {
  let fixture: ComponentFixture<PinInputComponent>;
  let component: PinInputComponent;

  function inputs(): HTMLInputElement[] {
    return fixture.nativeElement.querySelectorAll('input.pin-box');
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PinInputComponent] });
    fixture = TestBed.createComponent(PinInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('writeValue reparte cada carácter en su casilla', () => {
    component.writeValue('1234');
    expect(component.digits).toEqual(['1', '2', '3', '4']);
  });

  it('writeValue con menos de 4 dígitos deja el resto vacío', () => {
    component.writeValue('12');
    expect(component.digits).toEqual(['1', '2', '', '']);
  });

  it('writeValue(null) limpia las 4 casillas', () => {
    component.writeValue('1234');
    component.writeValue(null);
    expect(component.digits).toEqual(['', '', '', '']);
  });

  it('registerOnChange + escribir un dígito notifica el valor completo acumulado', () => {
    const onChange = jasmine.createSpy('onChange');
    component.registerOnChange(onChange);
    component.writeValue('12');

    component.onInput(2, { target: { value: '3' } } as unknown as Event);

    expect(onChange).toHaveBeenCalledWith('123');
  });

  it('onInput descarta caracteres no numéricos', () => {
    const onChange = jasmine.createSpy('onChange');
    component.registerOnChange(onChange);

    component.onInput(0, { target: { value: 'a' } } as unknown as Event);

    expect(component.digits[0]).toBe('');
  });

  it('setDisabledState refleja el estado disabled', () => {
    component.setDisabledState(true);
    expect(component.disabled).toBe(true);
  });

  it('onBlur llama a onTouched', () => {
    const onTouched = jasmine.createSpy('onTouched');
    component.registerOnTouched(onTouched);

    component.onBlur();

    expect(onTouched).toHaveBeenCalled();
  });

  it('renderiza 4 casillas de entrada', () => {
    expect(inputs().length).toBe(4);
  });

  it('onKeydown con Backspace en una casilla vacía borra la anterior', () => {
    const onChange = jasmine.createSpy('onChange');
    component.registerOnChange(onChange);
    component.writeValue('12');

    const evento = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true });
    component.onKeydown(2, evento);

    expect(component.digits).toEqual(['1', '', '', '']);
  });

  it('onPaste rellena las casillas con los dígitos pegados', () => {
    const onChange = jasmine.createSpy('onChange');
    component.registerOnChange(onChange);
    const evento = new ClipboardEvent('paste');
    Object.defineProperty(evento, 'clipboardData', { value: { getData: () => '5678' } });

    component.onPaste(evento);

    expect(component.digits).toEqual(['5', '6', '7', '8']);
    expect(onChange).toHaveBeenCalledWith('5678');
  });
});
