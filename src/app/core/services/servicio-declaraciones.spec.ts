import { TestBed } from '@angular/core/testing';

import { ServicioDeclaraciones } from './servicio-declaraciones';

describe('ServicioDeclaraciones', () => {
  let service: ServicioDeclaraciones;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServicioDeclaraciones);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
