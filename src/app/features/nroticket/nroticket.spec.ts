import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Nroticket } from './nroticket';

describe('Nroticket', () => {
  let component: Nroticket;
  let fixture: ComponentFixture<Nroticket>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Nroticket]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Nroticket);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
