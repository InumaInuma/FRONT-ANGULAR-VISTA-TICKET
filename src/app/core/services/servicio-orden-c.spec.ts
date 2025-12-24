import { TestBed } from '@angular/core/testing';

import { ServicioOrdenC } from './servicio-orden-c';

describe('ServicioOrdenC', () => {
  let service: ServicioOrdenC;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServicioOrdenC);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
