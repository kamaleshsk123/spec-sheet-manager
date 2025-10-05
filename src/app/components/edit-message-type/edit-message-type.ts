import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DefinitionDetailsComponent,
  ProtoFile,
  JsonSchema,
  JsonField,
  Message,
  Field
} from '../definition-details/definition-details';
import { ApiService, MessageType } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-edit-message-type',
  imports: [CommonModule, FormsModule, DefinitionDetailsComponent],
  templateUrl: './edit-message-type.html',
  styleUrl: './edit-message-type.css',
  standalone: true,
})
export class EditMessageType implements OnInit, OnChanges {
  @Input() message: MessageType | null = null;
  @Input() specType: 'protobuf' | 'json' = 'protobuf';
  @Output() done = new EventEmitter<void>();

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
  toggleValue: 'protobuf' | 'json' = 'protobuf';
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

  constructor(
    private apiService: ApiService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.initFromMessage();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['message'] || changes['specType']) {
      this.initFromMessage();
    }
  }

  private initFromMessage() {
    this.toggleValue = this.specType;
    if (this.message) {
      if (this.specType === 'protobuf') {
        this.protoFile.messages = [this.messageTypeToMessage(this.message)];
      } else {
        // JSON editing path
        if (this.message.json_schema) {
          this.jsonSchema = this.message.json_schema as any;
        } else {
          this.jsonSchema = {
            title: this.message.name || this.jsonSchema.title || 'Message',
            type: 'object',
            properties: {},
            required: [],
          } as any;
        }
        if (!this.jsonSchema.title || this.jsonSchema.title === 'StatusUpdate') {
          this.jsonSchema.title = this.message.name || 'Message';
        }
        this.jsonFields = this.jsonSchemaToFields(this.jsonSchema);
      }
    }
  }

  onNameChange(newName: string) {
    if (this.message) {
      this.message.name = newName;
    }
    if (this.toggleValue === 'json') {
      this.jsonSchema.title = newName || this.jsonSchema.title;
    }
  }

  save() {
    if (!this.message) return;

    let updatedMessage: Partial<MessageType>;

    if (this.toggleValue === 'json') {
      if (this.message && this.message.name) {
        this.jsonSchema.title = this.message.name;
      }
      updatedMessage = {
        name: this.message?.name || this.jsonSchema.title,
        json_schema: this.jsonSchema,
      };
    } else { // protobuf
      if (this.protoFile.messages.length > 0) {
        updatedMessage = this.messageToMessageType(this.protoFile.messages[0], this.message);
      } else {
        // Message was deleted explicitly by clearing proto message in editor
        this.apiService.deleteMessageType(this.message.id!).subscribe({
          next: (response) => {
            if (response.success) {
              this.notificationService.success('Message Type Deleted', 'Successfully deleted message type.');
            } else {
              this.notificationService.error('Delete Failed', response.error || 'Failed to delete message type.');
            }
            // this.done.emit();
          },
          error: () => {
            this.notificationService.error('Delete Error', 'An unknown error occurred.');
            // this.done.emit();
          }
        });
        return;
      }
    }

    this.apiService.updateMessageType(this.message.id!, updatedMessage).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Message Type Updated', 'Successfully updated message type.');
        } else {
          this.notificationService.error('Update Failed', response.error || 'Failed to update message type.');
        }
        // this.done.emit();
      },
      error: () => {
        this.notificationService.error('Update Error', 'An unknown error occurred.');
        // this.done.emit();
      }
    });
  }

  back() {
    // Simply emit done without saving any changes
    this.done.emit();
  }

  private messageTypeToMessage(messageType: MessageType): Message {
    const schema: any = messageType.json_schema || {};
    let fields: Field[] = [];

    if (Array.isArray(schema?.fields)) {
      fields = schema.fields.map((f: any) => ({
        name: f.name,
        type: f.type,
        number: f.number,
        repeated: f.repeated,
        optional: f.optional,
      }));
    } else if (schema && schema.properties) {
      const props = schema.properties || {};
      const required: string[] = schema.required || [];
      const toProtoType = (t: string) => {
        switch (t) {
          case 'integer':
            return 'int32';
          case 'number':
            return 'double';
          case 'boolean':
            return 'bool';
          case 'string':
          default:
            return 'string';
        }
      };
      let counter = 1;
      fields = Object.keys(props).map((key) => {
        const prop = props[key] || {};
        const isArray = prop.type === 'array';
        const itemType = isArray ? (prop.items?.type || 'string') : (prop.type || 'string');
        const field: Field = {
          name: key,
          type: toProtoType(itemType),
          number: counter++,
          repeated: !!isArray,
          optional: required.indexOf(key) === -1,
        };
        return field;
      });
    }

    return {
      name: messageType.name,
      fields: fields,
    };
  }

  private messageToMessageType(message: Message, originalMessageType: MessageType): Partial<MessageType> {
    const toJsonType = (t: string) => {
      switch (t) {
        case 'int32':
        case 'int64':
        case 'uint32':
        case 'uint64':
        case 'sint32':
        case 'sint64':
        case 'fixed32':
        case 'fixed64':
        case 'sfixed32':
        case 'sfixed64':
          return 'integer';
        case 'float':
        case 'double':
          return 'number';
        case 'bool':
          return 'boolean';
        case 'string':
        default:
          return 'string';
      }
    };

    const properties: any = {};
    const required: string[] = [];

    for (const f of message.fields) {
      if (f.repeated) {
        properties[f.name] = {
          type: 'array',
          items: { type: toJsonType(f.type) }
        };
      } else {
        properties[f.name] = { type: toJsonType(f.type) };
      }
      if (!f.optional) required.push(f.name);
    }

    const newJsonSchema = {
      title: message.name,
      type: 'object' as const,
      properties,
      required
    };

    return {
      name: message.name,
      json_schema: newJsonSchema
    };
  }

  private jsonSchemaToFields(schema: JsonSchema): JsonField[] {
    const build = (properties: { [key: string]: any }, required: string[] = []): JsonField[] => {
      const fields: JsonField[] = [];
      const keys = Object.keys(properties || {});
      for (const key of keys) {
        const prop = properties[key] || {};
        const type = prop.type || 'string';
        const isRequired = required.includes(key);

        const base: JsonField = {
          name: key,
          is_required: !!isRequired,
          type: type === 'time' ? 'string' : type,
          pattern: prop.pattern,
          minimum: prop.minimum,
          maximum: prop.maximum,
          enum: prop.enum,
          digits: prop['x-digits'],
          children: [],
          items: { type: 'string', children: [] },
          isExpanded: true,
        };

        if (type === 'object') {
          const nestedProps = prop.properties || {};
          base.children = build(nestedProps, prop.required || []);
        } else if (type === 'array') {
          const itemSchema = prop.items || { type: 'string' };
          base.items = { type: itemSchema.type || 'string', children: [] };
          if (itemSchema.type === 'object') {
            base.items.children = build(itemSchema.properties || {}, itemSchema.required || []);
          }
        }

        fields.push(base);
      }
      return fields;
    };

    return build(schema.properties || {}, schema.required || []);
  }
}
