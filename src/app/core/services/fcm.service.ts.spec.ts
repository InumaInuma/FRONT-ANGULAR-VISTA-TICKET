import { TestBed } from '@angular/core/testing';

import { FcmServiceTs } from './fcm.service.ts';

describe('FcmServiceTs', () => {
  let service: FcmServiceTs;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FcmServiceTs);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
