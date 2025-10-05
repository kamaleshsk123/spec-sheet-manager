import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../services/notification.service';

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
    payloadDefinition: '',
    json_schema: ''
  };

  constructor(private notificationService: NotificationService) {}

  closeModal() {
    this.close.emit();
  }

  saveMessage() {
    let schema = null;
    if (this.newMessage.json_schema && this.newMessage.json_schema.trim() !== '') {
      try {
        schema = JSON.parse(this.newMessage.json_schema);
      } catch (error) {
        this.notificationService.error('Invalid JSON', 'The JSON schema is not valid.');
        return;
      }
    }

    this.save.emit({ 
      name: this.newMessage.name, 
      payloadDefinition: this.newMessage.payloadDefinition,
      json_schema: schema
    });
    this.closeModal();
  }
}
