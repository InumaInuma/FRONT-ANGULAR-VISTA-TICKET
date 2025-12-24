import { TestBed } from '@angular/core/testing';

import { ServiciosCuestionario } from './servicios-cuestionario';

describe('ServiciosCuestionario', () => {
  let service: ServiciosCuestionario;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServiciosCuestionario);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
