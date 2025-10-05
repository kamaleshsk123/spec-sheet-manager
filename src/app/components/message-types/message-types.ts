import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AddMessageModalComponent } from '../add-message-modal/add-message-modal.component';
import { ApiService, MessageType } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { JsonSchemaProperty } from '../definition-details/definition-details';
import { MessageEnvelopeListComponent } from '../message-envelope-list/message-envelope-list.component';

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
    private notificationService: NotificationService
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

  private toCamelCase(str: string): string {
    if (!str) return '';
    return str.replace(/[^a-zA-Z0-9]+(.)?/g, (match, chr) => chr ? chr.toUpperCase() : '').replace(/^./, (match) => match.toLowerCase());
  }

  private generateDemoJsonFromFields(fields: any[]): any {
    if (!fields) return {};
    const demo: any = {};
    fields.forEach(field => {
      demo[field.name] = this.generateMockForProperty(field, field.name);
    });
    return demo;
  }

  private updateCombinedJson() {
    if (!this.selectedMessageEnvelope || !this.selectedMessage) {
      this.combinedJson = null;
      return;
    }

    const envelopePayload = this.generateDemoJsonFromFields(this.selectedMessageEnvelope.json_fields);
    const messagePayload = this.generateDemoJson(this.selectedMessage.json_schema);
    const messageKey = this.toCamelCase(this.selectedMessage.name);

    this.combinedJson = {
      ...envelopePayload,
      [messageKey]: messagePayload
    };
  }

  generateDemoJson(schema: any): any {
    if (!schema || !schema.properties) {
      return {};
    }
    const demo: any = {};
    const props = (schema.properties || {}) as { [key: string]: JsonSchemaProperty };
    Object.keys(props).forEach((key) => {
      demo[key] = this.generateMockForProperty(props[key], key);
    });
    return demo;
  }

  private generateMockForProperty(prop: JsonSchemaProperty, key: string): any {
    switch (prop.type) {
      case 'string': {
        if (prop.format === 'date-time') {
          const now = new Date();
          const randomOffset = Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000);
          const randomDate = new Date(now.getTime() - randomOffset);
          return randomDate.toISOString();
        }
        if (prop.enum && prop.enum.length > 0) {
          return prop.enum[Math.floor(Math.random() * prop.enum.length)];
        }
        if (prop.pattern && /^[A-Z0-9]{6}$/.test(prop.pattern)) {
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          let result = '';
          for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return result;
        }
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        const length = Math.floor(Math.random() * 8) + 5;
        for (let i = 0; i < length; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      }
      case 'integer': {
        if (prop['x-digits']) {
          const min = Math.pow(10, prop['x-digits'] - 1);
          const max = Math.pow(10, prop['x-digits']) - 1;
          return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        const min = prop.minimum ?? 0;
        const max = prop.maximum ?? min + 100;
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }
      case 'number': {
        if (prop['x-digits']) {
          const min = Math.pow(10, prop['x-digits'] - 1);
          const max = Math.pow(10, prop['x-digits']) - 1;
          return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        const min = prop.minimum ?? 0;
        const max = prop.maximum ?? min + 100;
        const randomNum = Math.random() * (max - min) + min;
        return Math.round(randomNum * 100) / 100;
      }
      case 'boolean':
        return Math.random() < 0.5;
      case 'object': {
        const child: any = {};
        const nestedProps = prop.properties || {};
        Object.keys(nestedProps).forEach((k) => {
          child[k] = this.generateMockForProperty(nestedProps[k], k);
        });
        return child;
      }
      case 'array': {
        const itemSchema = prop.items || ({ type: 'string' } as JsonSchemaProperty);
        const itemCount = Math.floor(Math.random() * 3) + 1;
        const items = [];
        for (let i = 0; i < itemCount; i++) {
          items.push(this.generateMockForProperty(itemSchema, key));
        }
        return items;
      }
      default:
        return null;
    }
  }
}