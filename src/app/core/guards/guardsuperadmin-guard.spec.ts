import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { guardsuperadminGuard } from './guardsuperadmin-guard';

describe('guardsuperadminGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => guardsuperadminGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
