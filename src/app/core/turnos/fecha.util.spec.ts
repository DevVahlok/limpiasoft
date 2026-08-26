import { horasEntre, mesActualIso, rangoDelMes } from './fecha.util';

describe('fecha.util', () => {
  describe('horasEntre', () => {
    it('calcula las horas entre dos horas del mismo día', () => {
      expect(horasEntre('09:00', '17:00')).toBe(8);
    });

    it('admite fracciones de hora', () => {
      expect(horasEntre('09:00', '09:30')).toBe(0.5);
    });

    it('devuelve 0 si inicio y fin coinciden', () => {
      expect(horasEntre('10:00', '10:00')).toBe(0);
    });

    it('devuelve un valor negativo si el fin es anterior al inicio (turno mal formado)', () => {
      expect(horasEntre('17:00', '09:00')).toBe(-8);
    });
  });

  describe('mesActualIso', () => {
    it('devuelve el mes actual en formato YYYY-MM', () => {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(2026, 7, 26)); // agosto 2026 (mes 0-indexado)
      expect(mesActualIso()).toBe('2026-08');
      jasmine.clock().uninstall();
    });

    it('rellena con cero los meses de un dígito', () => {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(2026, 2, 1)); // marzo
      expect(mesActualIso()).toBe('2026-03');
      jasmine.clock().uninstall();
    });
  });

  describe('rangoDelMes', () => {
    it('devuelve el primer y último día de un mes de 31 días', () => {
      expect(rangoDelMes('2026-01')).toEqual({ desde: '2026-01-01', hasta: '2026-01-31' });
    });

    it('devuelve el último día correcto de un mes de 30 días', () => {
      expect(rangoDelMes('2026-04')).toEqual({ desde: '2026-04-01', hasta: '2026-04-30' });
    });

    it('devuelve el último día correcto de febrero en año bisiesto', () => {
      expect(rangoDelMes('2028-02')).toEqual({ desde: '2028-02-01', hasta: '2028-02-29' });
    });

    it('devuelve el último día correcto de febrero en año no bisiesto', () => {
      expect(rangoDelMes('2026-02')).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' });
    });
  });
});
