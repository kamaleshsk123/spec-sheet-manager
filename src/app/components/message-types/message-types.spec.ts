import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageTypes } from './message-types';

describe('MessageTypes', () => {
  let component: MessageTypes;
  let fixture: ComponentFixture<MessageTypes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageTypes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MessageTypes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
