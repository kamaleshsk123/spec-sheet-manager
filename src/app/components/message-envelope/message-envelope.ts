import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DefinitionDetailsComponent,
  ProtoFile,
  JsonSchema,
  JsonField,
} from '../definition-details/definition-details';
import { NotificationService } from '../../services/notification.service';
import { MessageEnvelopeListComponent } from '../message-envelope-list/message-envelope-list.component';
import { MessageEnvelopeService } from '../../services/message-envelope.service';

@Component({
  selector: 'app-message-envelope',
  standalone: true,
  imports: [CommonModule, FormsModule, DefinitionDetailsComponent, MessageEnvelopeListComponent],
  templateUrl: './message-envelope.html',
  styleUrl: './message-envelope.css',
})
export class MessageEnvelope implements OnInit {
  protoFile: ProtoFile = {
    syntax: 'proto3',
    package: '',
    imports: [],
    messages: [],
    enums: [],
    services: [],
  };

  jsonSchema: JsonSchema = {
    title: 'StatusUpdate',
    type: 'object',
    properties: {},
    required: [],
  };

  jsonFields: JsonField[] = [];
  toggleValue: 'protobuf' | 'json' = 'json';
  code: string = '';
  editorOptions = {
    theme: 'vs-dark',
    language: 'plaintext',
    automaticLayout: true,
    scrollBeyondLastLine: false,
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on' as const,
    wordWrap: 'on' as const,
  };

  selectedMessageEnvelope: any = null;

  constructor(
    private messageEnvelopeService: MessageEnvelopeService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {}

  onEnvelopeSelected(envelope: any) {
    this.selectedMessageEnvelope = envelope;
    this.jsonFields = envelope.json_fields || [];
  }

  saveMessageEnvelope() {
    if (!this.selectedMessageEnvelope) {
      this.notificationService.error('Error', 'No message envelope selected.');
      return;
    }

    const data = {
      title: this.selectedMessageEnvelope.title,
      description: this.selectedMessageEnvelope.description,
      json_fields: this.jsonFields,
    };

    if (this.selectedMessageEnvelope.id) {
      this.messageEnvelopeService.updateMessageEnvelope(this.selectedMessageEnvelope.id, data).subscribe({
        next: (response: any) => {
          if (response.success) {
            this.notificationService.success('Success', 'Message envelope saved successfully.');
          } else {
            this.notificationService.error('Error', 'Failed to save message envelope.');
          }
        },
        error: (err: any) => {
          this.notificationService.error('Error', 'Failed to save message envelope.');
        },
      });
    } else {
      this.messageEnvelopeService.createMessageEnvelope(data).subscribe({
        next: (response: any) => {
          if (response.success && response.data) {
            this.notificationService.success('Success', 'Message envelope created successfully.');
            // The service will reload the list, and the new item will appear.
            // We select the newly created item.
            this.onEnvelopeSelected(response.data);
          } else {
            this.notificationService.error('Error', 'Failed to create message envelope.');
          }
        },
        error: (err: any) => {
          this.notificationService.error('Error', 'Failed to create message envelope.');
        },
      });
    }
  }
}
