import { Pipe, PipeTransform } from '@angular/core';

/** Reformatea una fecha ISO ('YYYY-MM-DD' o con hora incluida) a 'DD-MM-YYYY'. */
@Pipe({ name: 'fechaEs', standalone: true })
export class FechaEsPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    const [anio, mes, dia] = value.slice(0, 10).split('-');
    if (!anio || !mes || !dia) {
      return value;
    }
    return `${dia}-${mes}-${anio}`;
  }
}
