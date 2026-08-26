export interface Ciudad {
  nombre: string;
  lat: number;
  lng: number;
}

/** Centro aproximado de cada población, para centrar el mapa al elegirla. */
export const CIUDADES: Ciudad[] = [
  { nombre: 'Jerez de la Frontera', lat: 36.6866, lng: -6.1375 },
  { nombre: 'El Puerto de Santa María', lat: 36.5928, lng: -6.2306 },
  { nombre: 'Rota', lat: 36.6222, lng: -6.355 },
  { nombre: 'Puerto Real', lat: 36.5289, lng: -6.1861 },
  { nombre: 'Sanlúcar de Barrameda', lat: 36.7783, lng: -6.3531 },
  { nombre: 'Chiclana de la Frontera', lat: 36.4197, lng: -6.1478 },
  { nombre: 'San Fernando', lat: 36.4614, lng: -6.1997 },
  { nombre: 'Cádiz', lat: 36.5271, lng: -6.2886 },
];
