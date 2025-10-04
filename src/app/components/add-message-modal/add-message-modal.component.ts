
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-message-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-message-modal.component.html',
  styleUrls: ['./add-message-modal.component.css']
})
export class AddMessageModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();

  newMessage = {
    name: '',
    payloadDefinition: ''
  };

  closeModal() {
    this.close.emit();
  }

  saveMessage() {
    this.save.emit({ name: this.newMessage.name, payloadDefinition: this.newMessage.payloadDefinition });
    this.closeModal();
  }
}
