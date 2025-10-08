import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DefinitionDetailsComponent } from './definition-details';

describe('DefinitionDetailsComponent', () => {
  let component: DefinitionDetailsComponent;
  let fixture: ComponentFixture<DefinitionDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DefinitionDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DefinitionDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
