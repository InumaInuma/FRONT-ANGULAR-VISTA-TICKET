import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaExamenesComponent } from './lista-examenes';

describe('ListaExamenes', () => {
  let component: ListaExamenesComponent;
  let fixture: ComponentFixture<ListaExamenesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaExamenesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListaExamenesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
