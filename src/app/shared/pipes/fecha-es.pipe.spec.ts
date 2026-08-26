import { FechaEsPipe } from './fecha-es.pipe';

describe('FechaEsPipe', () => {
  const pipe = new FechaEsPipe();

  it('reformatea una fecha ISO simple a DD-MM-YYYY', () => {
    expect(pipe.transform('2026-08-26')).toBe('26-08-2026');
  });

  it('reformatea una fecha ISO con hora, ignorando la parte de hora', () => {
    expect(pipe.transform('2026-08-26T10:30:00Z')).toBe('26-08-2026');
  });

  it('devuelve "—" para null', () => {
    expect(pipe.transform(null)).toBe('—');
  });

  it('devuelve "—" para undefined', () => {
    expect(pipe.transform(undefined)).toBe('—');
  });

  it('devuelve "—" para cadena vacía', () => {
    expect(pipe.transform('')).toBe('—');
  });

  it('devuelve el valor original si no tiene formato de fecha reconocible', () => {
    expect(pipe.transform('abc')).toBe('abc');
  });
});
