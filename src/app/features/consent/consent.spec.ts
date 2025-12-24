import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Consent } from './consent';

describe('Consent', () => {
  let component: Consent;
  let fixture: ComponentFixture<Consent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Consent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Consent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
