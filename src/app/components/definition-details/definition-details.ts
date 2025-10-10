import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NuMonacoEditorModule } from '@ng-util/monaco-editor';

// Interfaces from editor.ts
export interface Field {
  type: string;
  name: string;
  number: number;
  repeated?: boolean;
  optional?: boolean;
  format?: string;
}

interface EnumValue {
  name: string;
  number: number;
}

export interface Enum {
  name: string;
  values: EnumValue[];
}

export interface Service {
  name: string;
  methods: ServiceMethod[];
}

interface ServiceMethod {
  name: string;
  inputType: string;
  outputType: string;
  streaming?: {
    input: boolean;
    output: boolean;
  };
}

export interface Message {
  name: string;
  fields: Field[];
  nestedMessages?: Message[];
  nestedEnums?: Enum[];
}

export interface ProtoFile {
  syntax: string;
  package?: string;
  imports: string[];
  messages: Message[];
  enums: Enum[];
  services: Service[];
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

export interface JsonSchema {
  title: string;
  type: 'object';
  properties: { [key: string]: JsonSchemaProperty };
  required: string[];
}

export interface JsonField {
  name: string;
  is_required: boolean;
  type: string;
  value?: any;
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

@Component({
  selector: 'app-definition-details',
  standalone: true,
  imports: [CommonModule, FormsModule, NuMonacoEditorModule],
  templateUrl: './definition-details.html',
  styleUrls: ['./definition-details.css'],
})
export class DefinitionDetailsComponent implements OnInit, OnChanges {
  @Input() protoFile!: ProtoFile;
  @Input() jsonSchema!: JsonSchema;
  @Input() jsonFields: JsonField[] = [];
  @Input() toggleValue: 'protobuf' | 'json' = 'protobuf';
  @Input() code: string = '';
  @Input() editorOptions: any;

  @Output() protoFileChange = new EventEmitter<ProtoFile>();
  @Output() jsonSchemaChange = new EventEmitter<JsonSchema>();
  @Output() jsonFieldsChange = new EventEmitter<JsonField[]>();
  @Output() codeChange = new EventEmitter<string>();
  @Output() toggleValueChange = new EventEmitter<'protobuf' | 'json'>();

  @ViewChild('fileInput') fileInput!: ElementRef;

  activeTab: 'messages' | 'enums' | 'services' | 'settings' = 'messages';
  toggleChecked = false;
  showJsonDemoOverlay = false;
  demoJsonText = '';

  constructor() {}

  ngOnInit() {
    this.toggleChecked = this.toggleValue === 'json';
    this.updateEditorContent();
  }

  shouldShowValueInput(type: string): boolean {
    return ['string', 'number', 'integer', 'boolean'].includes(type);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['jsonFields'] && this.toggleValue === 'json') {
      this.updateJsonPreview();
    }
  }

  setActiveTab(tab: 'messages' | 'enums' | 'services' | 'settings') {
    this.activeTab = tab;
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  updateEditorContent() {
    if (this.toggleValue === 'protobuf') {
      this.editorOptions = { ...this.editorOptions, language: 'plaintext' };
      this.updateProtoPreview();
    } else {
      this.editorOptions = { ...this.editorOptions, language: 'json' };
      if (this.activeTab !== 'messages') {
        this.setActiveTab('messages');
      }
      this.updateJsonPreview();
    }
    this.codeChange.emit(this.code);
  }

  // Protobuf methods
  addMessage() {
    this.protoFile.messages.push({
      name: 'NewMessage',
      fields: [],
      nestedMessages: [],
      nestedEnums: [],
    });
    this.protoFileChange.emit(this.protoFile);
    this.updateProtoPreview();
  }

  removeMessage(index: number) {
    this.protoFile.messages.splice(index, 1);
    this.protoFileChange.emit(this.protoFile);
    this.updateProtoPreview();
  }

  addField(message: Message) {
    message.fields.push({
      type: 'string',
      name: 'new_field',
      number: message.fields.length + 1,
    });
    this.protoFileChange.emit(this.protoFile);
    this.updateProtoPreview();
  }

  removeField(message: Message, index: number) {
    message.fields.splice(index, 1);
    this.protoFileChange.emit(this.protoFile);
    this.updateProtoPreview();
  }

  addEnum() {
    this.protoFile.enums.push({
      name: 'NewEnum',
      values: [{ name: 'UNKNOWN', number: 0 }],
    });
    this.protoFileChange.emit(this.protoFile);
    this.updateProtoPreview();
  }

  removeEnum(index: number) {
    this.protoFile.enums.splice(index, 1);
    this.protoFileChange.emit(this.protoFile);
    this.updateProtoPreview();
  }

  addEnumValue(enumItem: Enum) {
    const nextNumber = Math.max(...enumItem.values.map((v) => v.number), -1) + 1;
    enumItem.values.push({
      name: 'NEW_VALUE',
      number: nextNumber,
    });
    this.protoFileChange.emit(this.protoFile);
    this.updateProtoPreview();
  }

  removeEnumValue(enumItem: Enum, index: number) {
    enumItem.values.splice(index, 1);
    this.protoFileChange.emit(this.protoFile);
    this.updateProtoPreview();
  }

  addService() {
    this.protoFile.services.push({
      name: 'NewService',
      methods: [],
    });
    this.protoFileChange.emit(this.protoFile);
    this.updateProtoPreview();
  }

  removeService(index: number) {
    this.protoFile.services.splice(index, 1);
    this.protoFileChange.emit(this.protoFile);
    this.updateProtoPreview();
  }

  addServiceMethod(service: Service) {
    service.methods.push({
      name: 'NewMethod',
      inputType: 'google.protobuf.Empty',
      outputType: 'google.protobuf.Empty',
    });
    this.protoFileChange.emit(this.protoFile);
    this.updateProtoPreview();
  }

  removeServiceMethod(service: Service, index: number) {
    service.methods.splice(index, 1);
    this.protoFileChange.emit(this.protoFile);
    this.updateProtoPreview();
  }

  updateProtoPreview() {
    let protoContent = `syntax = "${this.protoFile.syntax}";

`;
    if (this.protoFile.package) {
      protoContent += `package ${this.protoFile.package};

`;
    }
    for (const importPath of this.protoFile.imports) {
      protoContent += `import "${importPath}";
`;
    }
    if (this.protoFile.imports.length > 0) {
      protoContent += '\n';
    }
    for (const enumItem of this.protoFile.enums) {
      protoContent += `enum ${enumItem.name} {
`;
      for (const value of enumItem.values) {
        protoContent += `  ${value.name} = ${value.number};
`;
      }
      protoContent += '}\n\n';
    }
    for (const message of this.protoFile.messages) {
      protoContent += this.generateMessageContent(message, 0);
    }
    for (const service of this.protoFile.services) {
      protoContent += `service ${service.name} {
`;
      for (const method of service.methods) {
        const inputStream = method.streaming?.input ? 'stream ' : '';
        const outputStream = method.streaming?.output ? 'stream ' : '';
        protoContent += `  rpc ${method.name}(${inputStream}${method.inputType}) returns (${outputStream}${method.outputType});
`;
      }
      protoContent += '}\n\n';
    }
    this.code = protoContent;
    this.codeChange.emit(this.code);
  }

  private generateMessageContent(message: Message, indent: number): string {
    const spaces = '  '.repeat(indent);
    let content = `${spaces}message ${message.name} {
`;

    if (message.nestedEnums) {
      for (const nestedEnum of message.nestedEnums) {
        content += `${spaces}  enum ${nestedEnum.name} {
`;
        for (const value of nestedEnum.values) {
          content += `${spaces}    ${value.name} = ${value.number};
`;
        }
        content += `${spaces}  }

`;
      }
    }

    if (message.nestedMessages) {
      for (const nestedMessage of message.nestedMessages) {
        content += this.generateMessageContent(nestedMessage, indent + 1);
      }
    }

    for (const field of message.fields) {
      const repeated = field.repeated ? 'repeated ' : '';
      const optional = field.optional ? 'optional ' : '';
      content += `${spaces}  ${repeated}${optional}${field.type} ${field.name} = ${field.number};
`;
    }

    content += `${spaces}}

`;
    return content;
  }

  // JSON methods
  addJsonField(parent?: JsonField, isArrayItem: boolean = false) {
    const newField: JsonField = {
      name: 'new_field',
      is_required: false,
      type: 'string',
      children: [],
      items: { type: 'string', children: [] },
      isExpanded: false,
    };
    if (parent) {
      if (isArrayItem) {
        parent.items.children = [...parent.items.children, newField];
      } else {
        parent.children = [...parent.children, newField];
      }
      this.jsonFields = [...this.jsonFields];
    } else {
      this.jsonFields = [...this.jsonFields, newField];
    }
    this.jsonFieldsChange.emit(this.jsonFields);
    this.updateJsonPreview();
  }

  removeJsonField(index: number, parent?: JsonField, isArrayItem: boolean = false) {
    const target = isArrayItem
      ? parent!.items.children
      : parent
      ? parent.children
      : this.jsonFields;
    target.splice(index, 1);
    this.jsonFieldsChange.emit(this.jsonFields);
    this.updateJsonPreview();
  }

  onFieldTypeChange(field: JsonField) {
    if (field.type === 'object' && !field.children) {
      field.children = [];
    } else if (field.type === 'array' && !field.items) {
      field.items = { type: 'string', children: [] };
    }
    this.updateJsonPreview();
  }

  toggleField(field: JsonField) {
    field.isExpanded = !field.isExpanded;
  }

  updateJsonPreview() {
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
    const { properties, required } = buildSchema(this.jsonFields);
    this.jsonSchema.properties = properties;
    this.jsonSchema.required = required;
    this.jsonSchemaChange.emit(this.jsonSchema);
    this.code = JSON.stringify(this.jsonSchema, null, 2);
    this.codeChange.emit(this.code);
    this.demoJsonText = JSON.stringify(this.generateDemoFromFields(this.jsonFields), null, 2);
  }

  private generateDemoFromFields(fields: JsonField[]): any {
    const demo: any = {};
    for (const field of fields) {
      if (!field.name) continue;

      if (field.value !== null && field.value !== undefined && field.value !== '') {
        demo[field.name] = field.value;
      } else if (field.type === 'object') {
        demo[field.name] = this.generateDemoFromFields(field.children);
      } else if (field.type === 'array') {
        const itemCount = Math.floor(Math.random() * 3) + 1; // 1 to 3 items
        const items = [];
        for (let i = 0; i < itemCount; i++) {
          if (field.items.type === 'object') {
            items.push(this.generateDemoFromFields(field.items.children));
          } else {
            // Create a temporary JsonSchemaProperty for mock generation
            const tempSchemaProp: JsonSchemaProperty = { type: field.items.type };
            items.push(this.generateMockForProperty(tempSchemaProp, field.name));
          }
        }
        demo[field.name] = items;
      } else {
        // Create a temporary JsonSchemaProperty for mock generation from the JsonField
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

  updateJsonEnum(event: string, field: JsonField) {
    if (event && event.trim()) {
      const isNumeric = field.type === 'number' || field.type === 'integer';
      field.enum = event.split(',').map((s) => {
        const trimmed = s.trim();
        return isNumeric && trimmed ? Number(trimmed) : trimmed;
      });
    } else {
      field.enum = [];
    }
    this.jsonFieldsChange.emit(this.jsonFields);
    this.updateJsonPreview();
  }

  private jsonToProtoType(jsonType: string): string {
    switch (jsonType) {
      case 'number':
        return 'double';
      case 'integer':
        return 'int32';
      case 'boolean':
        return 'bool';
      case 'string':
      case 'time':
        return 'string';
      default:
        return 'string';
    }
  }

  private convertJsonToProto() {
    if (this.jsonFields.length === 0) {
      return;
    }

    const message: Message = {
      name: this.jsonSchema.title || 'NewMessage',
      fields: [],
      nestedMessages: [],
    };

    let fieldNumber = 1;
    for (const jsonField of this.jsonFields) {
      const field: Field = {
        name: jsonField.name,
        type: this.jsonToProtoType(jsonField.type),
        number: fieldNumber++,
        repeated: jsonField.type === 'array',
        optional: !jsonField.is_required,
      };

      if (jsonField.type === 'time') {
        field.format = 'date-time';
      }

      if (jsonField.type === 'object') {
        const nestedMessage: Message = {
          name: jsonField.name,
          fields: [],
        };
        let nestedFieldNumber = 1;
        for (const child of jsonField.children) {
          nestedMessage.fields.push({
            name: child.name,
            type: this.jsonToProtoType(child.type),
            number: nestedFieldNumber++,
            repeated: child.type === 'array',
            optional: !child.is_required,
          });
        }
        message.nestedMessages?.push(nestedMessage);
        field.type = jsonField.name;
      }

      if (jsonField.type === 'array' && jsonField.items.type === 'object') {
        const nestedMessage: Message = {
          name: jsonField.name + 'Item',
          fields: [],
        };
        let nestedFieldNumber = 1;
        for (const child of jsonField.items.children) {
          nestedMessage.fields.push({
            name: child.name,
            type: this.jsonToProtoType(child.type),
            number: nestedFieldNumber++,
            repeated: child.type === 'array',
            optional: !child.is_required,
          });
        }
        message.nestedMessages?.push(nestedMessage);
        field.type = jsonField.name + 'Item';
      }
      
      message.fields.push(field);
    }

    this.protoFile.messages = [message];
    this.protoFileChange.emit(this.protoFile);
  }

  private protoToJSONType(protoType: string): string {
    switch (protoType) {
      case 'double':
      case 'float':
        return 'number';
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
      case 'bool':
        return 'boolean';
      case 'string':
      case 'bytes':
        return 'string';
      default:
        // This is a nested message
        return 'object';
    }
  }

  private convertProtoToJson() {
    if (this.protoFile.messages.length === 0) {
      return;
    }

    const jsonFields: JsonField[] = [];
    const message = this.protoFile.messages[0];

    for (const field of message.fields) {
      const jsonField: JsonField = {
        name: field.name,
        type: this.protoToJSONType(field.type),
        is_required: !field.optional,
        children: [],
        items: { type: 'string', children: [] },
        isExpanded: false,
      };

      if (field.format === 'date-time') {
        jsonField.type = 'time';
      }

      if (field.repeated) {
        jsonField.type = 'array';
        // find the nested message
        const nestedMessage = this.protoFile.messages.find(m => m.name === field.type);
        if (nestedMessage) {
          jsonField.items.type = 'object';
          for (const nestedField of nestedMessage.fields) {
            jsonField.items.children.push({
              name: nestedField.name,
              type: this.protoToJSONType(nestedField.type),
              is_required: !nestedField.optional,
              children: [],
              items: { type: 'string', children: [] },
              isExpanded: false,
            });
          }
        } else {
          jsonField.items.type = this.protoToJSONType(field.type);
        }
      }

      const nestedMessage = this.protoFile.messages.find(m => m.name === field.type);
      if (nestedMessage) {
        for (const nestedField of nestedMessage.fields) {
          jsonField.children.push({
            name: nestedField.name,
            type: this.protoToJSONType(nestedField.type),
            is_required: !nestedField.optional,
            children: [],
            items: { type: 'string', children: [] },
            isExpanded: false,
          });
        }
      }


      jsonFields.push(jsonField);
    }

    this.jsonFields = jsonFields;
    this.jsonFieldsChange.emit(this.jsonFields);
  }


  onToggleChange() {
    this.toggleValue = this.toggleChecked ? 'json' : 'protobuf';
    this.toggleValueChange.emit(this.toggleValue);

    if (this.toggleValue === 'protobuf') {
      this.convertJsonToProto();
    } else {
      this.convertProtoToJson();
    }

    this.updateEditorContent();
  }

  uploadSpec() {
    this.fileInput.nativeElement.click();
  }

  handleFileSelect(event: any) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const content = e.target.result;
      try {
        const ast = JSON.parse(content); // Assuming JSON for simplicity, needs robust parsing
        // this.fromAst(ast);
        this.updateEditorContent();
      } catch (error: any) {
        console.error('Parse error', error);
      }
    };
    reader.readAsText(file);
  }

  showJsonDemo() {
    // Generate mock JSON from current schema and show overlay
    this.demoJsonText = this.generateDemoJson();
    this.showJsonDemoOverlay = true;
  }

  closeJsonDemoOverlay() {
    this.showJsonDemoOverlay = false;
  }

  private generateDemoJson(): string {
    const demo: any = {};
    const schema = (this.jsonSchema as any) || {};
    if (schema.title) {
      demo.title = schema.title || 'Demo Json Spec';
    }
    const props = (schema.properties || {}) as { [key: string]: JsonSchemaProperty };
    Object.keys(props).forEach((key) => {
      demo[key] = this.generateMockForProperty(props[key], key);
    });
    return JSON.stringify(demo, null, 2);
  }

  private generateMockForProperty(prop: JsonSchemaProperty, key: string): any {
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
          child[k] = this.generateMockForProperty(nestedProps[k], k);
        });
        return child;
      }
      case 'array': {
        const itemSchema = prop.items || ({ type: 'string' } as JsonSchemaProperty);
        const itemCount = Math.floor(Math.random() * 3) + 1; // 1 to 3 items
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

  private escapeHtml(text: string): string {
    return (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  copyCode() {
    // Logic to copy code to clipboard
  }
}
