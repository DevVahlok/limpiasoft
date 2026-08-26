import { CIUDADES } from './ciudades';

describe('CIUDADES', () => {
  it('contiene exactamente 8 ciudades', () => {
    expect(CIUDADES.length).toBe(8);
  });

  it('todos los nombres son únicos', () => {
    const nombres = CIUDADES.map((c) => c.nombre);
    expect(new Set(nombres).size).toBe(nombres.length);
  });

  it('"Jerez de la Frontera" es la primera entrada, ya que la UI la usa por defecto', () => {
    expect(CIUDADES[0].nombre).toBe('Jerez de la Frontera');
  });

  it('todas las coordenadas están dentro de rangos plausibles para la provincia de Cádiz', () => {
    for (const ciudad of CIUDADES) {
      expect(ciudad.lat).toBeGreaterThanOrEqual(36);
      expect(ciudad.lat).toBeLessThanOrEqual(37);
      expect(ciudad.lng).toBeGreaterThanOrEqual(-7);
      expect(ciudad.lng).toBeLessThanOrEqual(-5.5);
    }
  });

  it('ninguna ciudad tiene nombre vacío', () => {
    for (const ciudad of CIUDADES) {
      expect(ciudad.nombre.trim().length).toBeGreaterThan(0);
    }
  });
});
