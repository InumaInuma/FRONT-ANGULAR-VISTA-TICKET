import { TestBed } from '@angular/core/testing';

import { ServicioNroticket } from './servicio-nroticket';

describe('Nroticket', () => {
  let service: ServicioNroticket;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServicioNroticket);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
