import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DefinitionDetailsComponent,
  ProtoFile,
  JsonSchema,
  JsonField,
} from '../definition-details/definition-details';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-message-envelope',
  standalone: true,
  imports: [CommonModule, FormsModule, DefinitionDetailsComponent],
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

  messageEnvelope: any = {};

  constructor(
    private apiService: ApiService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadMessageEnvelope();
  }

  loadMessageEnvelope() {
    this.apiService.getMessageEnvelopes().subscribe({
      next: (response) => {
        if (response.success && response.data && response.data.length > 0) {
          this.messageEnvelope = response.data[0];
          this.jsonFields = this.messageEnvelope.json_fields;
        } else {
          // Create a default message envelope if none exists
          this.apiService.createMessageEnvelope({
            title: 'Default Message Envelope',
            description: 'This is the default message envelope.',
            json_fields: [
              { name: 'imei', type: 'number', is_required: true, digits: 15, children: [], items: { type: 'string', children: [] } },
              { name: 'event_ts', type: 'time', is_required: true, children: [], items: { type: 'string', children: [] } },
              { name: 'message-type', type: 'number', is_required: true, children: [], items: { type: 'string', children: [] } },
              { name: 'sequence', type: 'number', is_required: true, children: [], items: { type: 'string', children: [] } },
              { name: 'csq-dbm', type: 'number', is_required: true, children: [], items: { type: 'string', children: [] } },
              { name: 'rat_code', type: 'number', is_required: true, children: [], items: { type: 'string', children: [] } },
              { name: 'cmd_id', type: 'number', is_required: true, children: [], items: { type: 'string', children: [] } },
            ]
          }).subscribe({
            next: (response) => {
              if (response.success && response.data) {
                this.messageEnvelope = response.data;
                this.jsonFields = this.messageEnvelope.json_fields;
              }
            }
          });
        }
      },
      error: (err) => {
        this.notificationService.error('Error', 'Failed to load message envelope.');
      },
    });
  }

  saveMessageEnvelope() {
    const data = {
      title: this.messageEnvelope.title,
      description: this.messageEnvelope.description,
      json_fields: this.jsonFields,
    };

    if (this.messageEnvelope.id) {
      this.apiService.updateMessageEnvelope(this.messageEnvelope.id, data).subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Success', 'Message envelope saved successfully.');
          } else {
            this.notificationService.error('Error', 'Failed to save message envelope.');
          }
        },
        error: (err) => {
          this.notificationService.error('Error', 'Failed to save message envelope.');
        },
      });
    } else {
      this.apiService.createMessageEnvelope(data).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.messageEnvelope = response.data; // Assign the new ID
            this.notificationService.success('Success', 'Message envelope created successfully.');
          } else {
            this.notificationService.error('Error', 'Failed to create message envelope.');
          }
        },
        error: (err) => {
          this.notificationService.error('Error', 'Failed to create message envelope.');
        },
      });
    }
  }
}