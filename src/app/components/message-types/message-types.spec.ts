import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageTypesComponent } from './message-types';

describe('MessageTypesComponent', () => {
  let component: MessageTypesComponent;
  let fixture: ComponentFixture<MessageTypesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageTypesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MessageTypesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
