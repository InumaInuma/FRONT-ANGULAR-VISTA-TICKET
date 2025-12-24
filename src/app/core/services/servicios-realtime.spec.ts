import { TestBed } from '@angular/core/testing';

import { ServiciosRealtime } from './servicios-realtime';

describe('ServiciosRealtime', () => {
  let service: ServiciosRealtime;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServiciosRealtime);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
