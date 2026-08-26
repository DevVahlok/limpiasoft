import { TestBed } from '@angular/core/testing';

import { SupabaseService } from './supabase.service';

describe('SupabaseService', () => {
  let service: SupabaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SupabaseService);
  });

  it('se construye sin lanzar', () => {
    expect(service).toBeTruthy();
  });

  it('expone un client con from, auth y functions', () => {
    expect(service.client).toBeTruthy();
    expect(typeof service.client.from).toBe('function');
    expect(service.client.auth).toBeTruthy();
    expect(service.client.functions).toBeTruthy();
    expect(typeof service.client.functions.invoke).toBe('function');
  });
});
