import { TestBed } from '@angular/core/testing';

import { ServiciosExamenes } from './servicios-examenes';

describe('ServiciosExamenes', () => {
  let service: ServiciosExamenes;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServiciosExamenes);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
