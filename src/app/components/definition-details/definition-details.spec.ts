import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DefinitionDetails } from './definition-details';

describe('DefinitionDetails', () => {
  let component: DefinitionDetails;
  let fixture: ComponentFixture<DefinitionDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DefinitionDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DefinitionDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
