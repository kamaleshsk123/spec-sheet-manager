import { Injectable } from '@angular/core';
import { JsonField, JsonSchemaProperty } from '../components/definition-details/definition-details';

@Injectable({
  providedIn: 'root'
})
export class JsonGeneratorService {

  constructor() { }

  public toCamelCase(str: string): string {
    if (!str) return '';
    return str.replace(/[^a-zA-Z0-9]+(.)?/g, (match, chr) => chr ? chr.toUpperCase() : '').replace(/^./, (match) => match.toLowerCase());
  }

  public generateDemoJsonFromFields(fields: any[]): any {
    const demo: any = {};
    for (const field of fields) {
      if (!field.name) continue;

      if (field.value !== null && field.value !== undefined && field.value !== '') {
        demo[field.name] = field.value;
      } else if (field.type === 'object') {
        demo[field.name] = this.generateDemoJsonFromFields(field.children);
      } else if (field.type === 'array') {
        const itemCount = Math.floor(Math.random() * 3) + 1;
        const items = [];
        for (let i = 0; i < itemCount; i++) {
          if (field.items.type === 'object') {
            items.push(this.generateDemoJsonFromFields(field.items.children));
          } else {
            const tempSchemaProp: JsonSchemaProperty = { type: field.items.type };
            items.push(this.generateMockForProperty(tempSchemaProp, field.name));
          }
        }
        demo[field.name] = items;
      } else {
        const tempSchemaProp: JsonSchemaProperty = {
          type: field.type,
          format: field.type === 'time' ? 'date-time' : undefined,
          pattern: field.pattern,
          minimum: field.minimum,
          maximum: field.maximum,
          enum: field.enum,
          'x-digits': field.digits
        };
        demo[field.name] = this.generateMockForProperty(tempSchemaProp, field.name);
      }
    }
    return demo;
  }

  public generateDemoJson(schema: any): any {
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

  public generateMockForProperty(prop: JsonSchemaProperty, key: string): any {
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
