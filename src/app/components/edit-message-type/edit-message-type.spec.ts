import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditMessageType } from './edit-message-type';

describe('EditMessageType', () => {
  let component: EditMessageType;
  let fixture: ComponentFixture<EditMessageType>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditMessageType]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditMessageType);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
