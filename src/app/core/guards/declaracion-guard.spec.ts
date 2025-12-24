import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { declaracionGuard } from './declaracion-guard';

describe('declaracionGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => declaracionGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
