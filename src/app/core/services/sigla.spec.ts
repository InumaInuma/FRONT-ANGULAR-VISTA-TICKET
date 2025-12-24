import { TestBed } from '@angular/core/testing';

import { SiglaService } from './sigla';

describe('Sigla', () => {
  let service: SiglaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SiglaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
