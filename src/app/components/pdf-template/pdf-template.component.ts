import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PdfData {
  specTitle: string;
  specVersion: string;
  specDescription: string;
  deviceName: string;
  protocols: string[];
  documentStatus: string;
  applicableTo: string;
  selectedEnvelope?: {
    id: string;
    title: string;
  };
  demoJsonText?: string;
  messageTypes: Array<{
    name: string;
    json_schema?: any;
    demoJson?: string;
  }>;
  generatedDate: string;
}

@Component({
  selector: 'app-pdf-template',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-template.component.html',
  styleUrls: ['./pdf-template.component.css']
})
export class PdfTemplateComponent {
  @Input() data!: PdfData;

  constructor() {}

  // Format JSON schema with proper indentation
  formatJsonSchema(schema: any): string {
    try {
      if (!schema) {
        return 'No schema available';
      }
      return JSON.stringify(schema, null, 2);
    } catch (error) {
      console.error('Error formatting JSON schema:', error);
      return 'Invalid JSON Schema';
    }
  }

  // Generate demo JSON for message types that don't have it
  generateDemoJson(messageType: any): string {
    if (messageType.demoJson) {
      return messageType.demoJson;
    }

    try {
      if (!messageType.json_schema || !messageType.json_schema.properties) {
        return JSON.stringify({
          "message": "Sample data for " + messageType.name,
          "timestamp": new Date().toISOString(),
          "id": messageType.name.toLowerCase().replace(/\s+/g, '_') + '_' + Math.floor(Math.random() * 1000)
        }, null, 2);
      }

      const demo: any = {};
      const props = messageType.json_schema.properties || {};
      
      Object.keys(props).forEach((key) => {
        const property = props[key];
        demo[key] = this.generateMockValue(property, key);
      });

      return JSON.stringify(demo, null, 2);
    } catch (error) {
      return JSON.stringify({
        "error": "Could not generate demo JSON",
        "timestamp": new Date().toISOString()
      }, null, 2);
    }
  }

  private generateMockValue(property: any, key: string): any {
    const type = property.type || 'string';
    
    switch (type) {
      case 'string':
        if (property.format === 'date-time') {
          return new Date().toISOString();
        }
        if (property.enum && property.enum.length > 0) {
          return property.enum[Math.floor(Math.random() * property.enum.length)];
        }
        if (key.toLowerCase().includes('id')) {
          return `${key}_${Math.floor(Math.random() * 10000)}`;
        }
        if (key.toLowerCase().includes('name')) {
          return `Sample ${key}`;
        }
        return `Sample ${key} value`;
        
      case 'number':
      case 'integer':
        const min = property.minimum || 0;
        const max = property.maximum || 100;
        return Math.floor(Math.random() * (max - min + 1)) + min;
        
      case 'boolean':
        return Math.random() < 0.5;
        
      case 'array':
        const arrayLength = Math.floor(Math.random() * 3) + 1;
        const items = [];
        for (let i = 0; i < arrayLength; i++) {
          if (property.items && property.items.type === 'object') {
            items.push(this.generateMockValue(property.items, key));
          } else {
            items.push(this.generateMockValue({ type: property.items?.type || 'string' }, `${key}_item`));
          }
        }
        return items;
        
      case 'object':
        const nestedDemo: any = {};
        if (property.properties) {
          Object.keys(property.properties).forEach((nestedKey) => {
            nestedDemo[nestedKey] = this.generateMockValue(property.properties[nestedKey], nestedKey);
          });
        }
        return nestedDemo;
        
      default:
        return `Sample ${key}`;
    }
  }
}