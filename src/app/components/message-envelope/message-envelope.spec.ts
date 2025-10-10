import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageEnvelope } from './message-envelope';

describe('MessageEnvelope', () => {
  let component: MessageEnvelope;
  let fixture: ComponentFixture<MessageEnvelope>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageEnvelope]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MessageEnvelope);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
