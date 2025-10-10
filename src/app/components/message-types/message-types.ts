import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AddMessageModalComponent } from '../add-message-modal/add-message-modal.component';
import { ApiService, MessageType } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { JsonSchemaProperty } from '../definition-details/definition-details';
import { MessageEnvelopeListComponent } from '../message-envelope-list/message-envelope-list.component';
import { JsonGeneratorService } from '../../services/json-generator.service';

@Component({
  selector: 'app-message-types',
  standalone: true,
  imports: [CommonModule, AddMessageModalComponent, FormsModule, MessageEnvelopeListComponent],
  templateUrl: './message-types.html',
  styleUrls: ['./message-types.css'],
})
export class MessageTypesComponent implements OnChanges {
  @Input() specId!: string;
  @Input() messageTypes: MessageType[] = [];
  @Input() selectedMessageId: string | null = null;
  @Output() edit = new EventEmitter<MessageType>();
  @Output() add = new EventEmitter<void>();
  showAddMessageModal = false;
  

  selectedMessage: MessageType | null = null;
  selectedMessageEnvelope: any = null;
  combinedJson: any = null;

  constructor(
    private apiService: ApiService,
    private notificationService: NotificationService,
    private jsonGeneratorService: JsonGeneratorService
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['messageTypes'] || changes['selectedMessageId']) {
      this.reselectCurrent();
    }
  }

  onEnvelopeSelected(envelope: any) {
    this.selectedMessageEnvelope = envelope;
    this.updateCombinedJson();
  }

  private reselectCurrent() {
    if (this.messageTypes && this.messageTypes.length > 0) {
      if (this.selectedMessageId) {
        const byId = this.messageTypes.find(m => m.id === this.selectedMessageId);
        if (byId) {
          this.selectMessage(byId);
          return;
        }
      }
      if (this.selectedMessage && this.selectedMessage.id) {
        const currentId = this.selectedMessage.id;
        this.selectMessage(this.messageTypes.find(m => m.id === currentId) || this.messageTypes[0]);
      } else {
        this.selectMessage(this.messageTypes[0]);
      }
    } else {
      this.selectMessage(null);
    }
  }

  selectMessage(msg: MessageType | null) {
    this.selectedMessage = msg;
    this.updateCombinedJson();
  }

  copyJson(json: any) {
    navigator.clipboard.writeText(JSON.stringify(json, null, 2));
  }

  openAddMessageModal() {
    this.showAddMessageModal = true;
  }

  closeAddMessageModal() {
    this.showAddMessageModal = false;
  }

  handleSaveMessage(newMessage: { name: string; payloadDefinition: string, json_schema: any }) {
    this.apiService.createMessageType(this.specId, newMessage).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Message Type Created', 'Successfully created message type.');
          this.add.emit();
          this.closeAddMessageModal();
        } else {
          this.notificationService.error('Create Failed', response.error || 'Failed to create message type.');
        }
      },
      error: (error) => {
        this.notificationService.error('Create Error', 'An unknown error occurred.');
      }
    });
  }

  editMessage(message: MessageType) {
    this.edit.emit(message);
  }

  private updateCombinedJson() {
    if (!this.selectedMessageEnvelope || !this.selectedMessage) {
      this.combinedJson = null;
      return;
    }

    const envelopePayload = this.jsonGeneratorService.generateDemoJsonFromFields(this.selectedMessageEnvelope.json_fields);
    const messagePayload = this.jsonGeneratorService.generateDemoJson(this.selectedMessage.json_schema);
    const messageKey = this.jsonGeneratorService.toCamelCase(this.selectedMessage.name);

    this.combinedJson = {
      ...envelopePayload,
      [messageKey]: messagePayload
    };
  }
}