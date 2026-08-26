import { TestBed } from '@angular/core/testing';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { Subject } from 'rxjs';

import { ResponsiveService } from './responsive.service';

describe('ResponsiveService', () => {
  let handsetSubject: Subject<BreakpointState>;
  let tabletSubject: Subject<BreakpointState>;
  let isMatchedSpy: jasmine.Spy;

  beforeEach(() => {
    handsetSubject = new Subject<BreakpointState>();
    tabletSubject = new Subject<BreakpointState>();
    isMatchedSpy = jasmine.createSpy('isMatched').and.returnValue(false);

    const observeSpy = jasmine.createSpy('observe').and.callFake((query: string) =>
      query === '(max-width: 599.98px)' ? handsetSubject.asObservable() : tabletSubject.asObservable()
    );

    TestBed.configureTestingModule({
      providers: [{ provide: BreakpointObserver, useValue: { observe: observeSpy, isMatched: isMatchedSpy } }],
    });
  });

  it('usa el resultado síncrono de isMatched como valor inicial', () => {
    isMatchedSpy.and.returnValue(true);
    const service = TestBed.inject(ResponsiveService);
    expect(service.isHandset()).toBe(true);
  });

  it('actualiza isHandset cuando el observable de móvil emite', () => {
    const service = TestBed.inject(ResponsiveService);
    expect(service.isHandset()).toBe(false);

    handsetSubject.next({ matches: true, breakpoints: {} });

    expect(service.isHandset()).toBe(true);
  });

  it('actualiza isTabletOrHandset de forma independiente de isHandset', () => {
    const service = TestBed.inject(ResponsiveService);

    tabletSubject.next({ matches: true, breakpoints: {} });

    expect(service.isTabletOrHandset()).toBe(true);
    expect(service.isHandset()).toBe(false);
  });
});
