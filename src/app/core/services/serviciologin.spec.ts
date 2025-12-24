import { TestBed } from '@angular/core/testing';
import { Serviciologin } from './serviciologin';



describe('Serviciologin', () => {
  let service: Serviciologin;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Serviciologin);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
