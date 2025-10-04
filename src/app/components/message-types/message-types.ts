import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AddMessageModalComponent } from '../add-message-modal/add-message-modal.component';

export interface JsonField {
  name: string;
  is_required: boolean;
  type: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  enum?: any[];
  digits?: number;
  children: JsonField[];
  items: {
    type: string;
    children: JsonField[];
  };
  isExpanded?: boolean;
}

export interface JsonSchemaProperty {
  type: string;
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  enum?: any[];
  properties?: { [key: string]: JsonSchemaProperty };
  required?: string[];
  items?: JsonSchemaProperty;
  'x-digits'?: number;
}

interface MessageType {
  id: number;
  name: string;
  payloadDefinition?: string;
  json: any | null;
  fields: JsonField[];
}

@Component({
  selector: 'app-message-types',
  imports: [CommonModule, AddMessageModalComponent],
  templateUrl: './message-types.html',
  styleUrl: './message-types.css',
})
export class MessageTypes {
  @Input() messageTypes: MessageType[] = [];
  @Output() edit = new EventEmitter<MessageType>();
  showAddMessageModal = false;

  // Default select first message
  selectedMessage: MessageType | null = null;

  ngOnInit() {
    if (this.messageTypes.length > 0) {
      this.selectedMessage = this.messageTypes[0];
    }
  }

  selectMessage(msg: any) {
    this.selectedMessage = msg;
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

  handleSaveMessage(newMessage: { name: string; payloadDefinition: string }) {
    const newId = Math.max(...this.messageTypes.map((m) => m.id)) + 1;
    this.messageTypes.push({ ...newMessage, id: newId, json: null, fields: [] });
    this.selectMessage(this.messageTypes[this.messageTypes.length - 1]);
  }

  editMessage(message: MessageType) {
    this.edit.emit(message);
  }

  generateJson(fields: JsonField[]): any {
    if (!fields || fields.length === 0) {
      return null;
    }

    const buildSchema = (
      fields: JsonField[]
    ): { properties: { [key: string]: JsonSchemaProperty }; required: string[] } => {
      const properties: { [key: string]: JsonSchemaProperty } = {};
      const required: string[] = [];
      for (const field of fields) {
        if (!field.name) continue;
        const property: JsonSchemaProperty = { type: field.type === 'time' ? 'string' : field.type };
        if (field.type === 'time') property.format = 'date-time';
        if (field.is_required) required.push(field.name);
        if (field.type === 'string' && field.pattern) property.pattern = field.pattern;
        if (field.type === 'number' || field.type === 'integer') {
          if (field.minimum !== null && field.minimum !== undefined)
            property.minimum = field.minimum;
          if (field.maximum !== null && field.maximum !== undefined)
            property.maximum = field.maximum;
          if (field.digits)
            property['x-digits'] = field.digits;
        }
        if (field.enum && field.enum.length > 0 && (field.enum.length > 1 || field.enum[0]))
          property.enum = field.enum;
        if (field.type === 'object') {
          const nestedSchema = buildSchema(field.children);
          property.properties = nestedSchema.properties;
          if (nestedSchema.required.length > 0) property.required = nestedSchema.required;
        } else if (field.type === 'array') {
          const itemsSchema: JsonSchemaProperty = { type: field.items.type === 'time' ? 'string' : field.items.type };
          if (field.items.type === 'time') itemsSchema.format = 'date-time';
          if (field.items.type === 'object') {
            const nestedSchema = buildSchema(field.items.children);
            itemsSchema.properties = nestedSchema.properties;
            if (nestedSchema.required.length > 0) itemsSchema.required = nestedSchema.required;
          }
          property.items = itemsSchema;
        }
        properties[field.name] = property;
      }
      return { properties, required };
    };

    const { properties } = buildSchema(fields);
    const demo: any = {};
    Object.keys(properties).forEach((key) => {
      demo[key] = this.getMockValue(properties[key], key);
    });
    return demo;
  }

  private getMockValue(prop: JsonSchemaProperty, key: string): any {
    switch (prop.type) {
      case 'string': {
        if (prop.format === 'date-time') {
          // Generate a valid ISO 8601 timestamp
          const now = new Date();
          const randomOffset = Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000); // Random offset up to 1 year
          const randomDate = new Date(now.getTime() - randomOffset);
          return randomDate.toISOString();
        }
        if (prop.enum && prop.enum.length > 0) {
          return prop.enum[Math.floor(Math.random() * prop.enum.length)];
        }
        if (prop.pattern && /^\[A-Z0-9\]{6}$/.test(prop.pattern)) {
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          let result = '';
          for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return result;
        }
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        const length = Math.floor(Math.random() * 8) + 5; // Random length between 5 and 12
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
          child[k] = this.getMockValue(nestedProps[k], k);
        });
        return child;
      }
      case 'array': {
        const itemSchema = prop.items || ({ type: 'string' } as JsonSchemaProperty);
        const itemCount = Math.floor(Math.random() * 3) + 1; // 1 to 3 items
        const items = [];
        for (let i = 0; i < itemCount; i++) {
          items.push(this.getMockValue(itemSchema, key));
        }
        return items;
      }
      default:
        return null;
    }
  }
}
