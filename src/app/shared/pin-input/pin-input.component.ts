import { CommonModule } from '@angular/common';
import { Component, ElementRef, QueryList, ViewChildren, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** 4 casillas para un PIN numérico, una por dígito, con avance automático de foco. */
@Component({
  selector: 'app-pin-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pin-input.component.html',
  styleUrls: ['./pin-input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PinInputComponent),
      multi: true,
    },
  ],
})
export class PinInputComponent implements ControlValueAccessor {
  @ViewChildren('digitInput') private inputs!: QueryList<ElementRef<HTMLInputElement>>;

  readonly indices = [0, 1, 2, 3];
  digits: string[] = ['', '', '', ''];
  disabled = false;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    const chars = (value ?? '').split('');
    this.digits = this.indices.map((i) => chars[i] ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const digit = input.value.replace(/\D/g, '').slice(-1);
    this.digits[index] = digit;
    input.value = digit;
    if (digit && index < 3) {
      this.focusInput(index + 1);
    }
    this.emitirValor();
  }

  onKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.digits[index] && index > 0) {
      event.preventDefault();
      this.digits[index - 1] = '';
      this.focusInput(index - 1);
      this.emitirValor();
    } else if (event.key === 'ArrowLeft' && index > 0) {
      this.focusInput(index - 1);
    } else if (event.key === 'ArrowRight' && index < 3) {
      this.focusInput(index + 1);
    }
  }

  onPaste(event: ClipboardEvent): void {
    const digitos = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, 4).split('');
    if (digitos.length === 0) {
      return;
    }
    event.preventDefault();
    this.digits = this.indices.map((i) => digitos[i] ?? '');
    this.emitirValor();
    this.focusInput(Math.min(digitos.length, 3));
  }

  onFocus(event: FocusEvent): void {
    (event.target as HTMLInputElement).select();
  }

  onBlur(): void {
    this.onTouched();
  }

  private focusInput(index: number): void {
    this.inputs.get(index)?.nativeElement.focus();
  }

  private emitirValor(): void {
    this.onChange(this.digits.join(''));
  }
}
