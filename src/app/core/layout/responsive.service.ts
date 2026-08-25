import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map } from 'rxjs';

const HANDSET_QUERY = '(max-width: 599.98px)';
// Tablet incluido: por debajo de este ancho el menú lateral de los 3 shells
// se colapsa a un menú de hamburguesa, aunque las tablas/el calendario sigan
// mostrando su versión de escritorio (isHandset) hasta los 599.98px.
const TABLET_OR_HANDSET_QUERY = '(max-width: 959.98px)';

@Injectable({ providedIn: 'root' })
export class ResponsiveService {
  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly isHandset = toSignal(
    this.breakpointObserver.observe(HANDSET_QUERY).pipe(map((result) => result.matches)),
    { initialValue: this.breakpointObserver.isMatched(HANDSET_QUERY) }
  );

  readonly isTabletOrHandset = toSignal(
    this.breakpointObserver.observe(TABLET_OR_HANDSET_QUERY).pipe(map((result) => result.matches)),
    { initialValue: this.breakpointObserver.isMatched(TABLET_OR_HANDSET_QUERY) }
  );
}
