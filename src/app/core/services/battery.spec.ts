import { TestBed } from '@angular/core/testing';

import { Battery } from './battery';

describe('Battery', () => {
  let service: Battery;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Battery);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
