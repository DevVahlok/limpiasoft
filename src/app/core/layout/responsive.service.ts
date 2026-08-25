import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map } from 'rxjs';

const HANDSET_QUERY = '(max-width: 599.98px)';

@Injectable({ providedIn: 'root' })
export class ResponsiveService {
  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly isHandset = toSignal(
    this.breakpointObserver.observe(HANDSET_QUERY).pipe(map((result) => result.matches)),
    { initialValue: this.breakpointObserver.isMatched(HANDSET_QUERY) }
  );
}
