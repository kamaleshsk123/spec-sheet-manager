import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NuMonacoEditorModule } from '@ng-util/monaco-editor';

interface Field {
  type: string;
  name: string;
  number: number;
  repeated?: boolean;
  optional?: boolean;
}

interface EnumValue {
  name: string;
  number: number;
}

interface Enum {
  name: string;
  values: EnumValue[];
}

interface Service {
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

interface Message {
  name: string;
  fields: Field[];
  nestedMessages?: Message[];
  nestedEnums?: Enum[];
}

interface ProtoFile {
  syntax: string;
  package?: string;
  imports: string[];
  messages: Message[];
  enums: Enum[];
  services: Service[];
}

@Component({
  selector: 'app-editor',
  imports: [CommonModule, FormsModule, NuMonacoEditorModule],
  templateUrl: './editor.html',
  styleUrl: './editor.css'
})
export class EditorComponent implements OnInit {
  editorOptions = {
    theme: 'vs-dark',
    language: 'plaintext',
    automaticLayout: true,
    scrollBeyondLastLine: false,
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on' as const,
    wordWrap: 'on' as const
  };
  code: string = 'syntax = "proto3";';

  // Spec details
  specTitle: string = '';
  specVersion: string = '';
  specDescription: string = '';

  protoFile: ProtoFile = {
    syntax: 'proto3',
    package: '',
    imports: [],
    messages: [],
    enums: [],
    services: []
  };
  showDownloadMenu: boolean = false;
  activeTab: 'messages' | 'enums' | 'services' | 'settings' = 'messages';

  ngOnInit() {
    this.updateProtoPreview();
  }

  // Message methods
  addMessage() {
    this.protoFile.messages.push({ 
      name: 'NewMessage', 
      fields: [],
      nestedMessages: [],
      nestedEnums: []
    });
    this.updateProtoPreview();
  }

  removeMessage(index: number) {
    this.protoFile.messages.splice(index, 1);
    this.updateProtoPreview();
  }

  addField(message: Message) {
    message.fields.push({ 
      type: 'string', 
      name: 'new_field', 
      number: message.fields.length + 1,
      repeated: false,
      optional: false
    });
    this.updateProtoPreview();
  }

  removeField(message: Message, index: number) {
    message.fields.splice(index, 1);
    this.updateProtoPreview();
  }

  // Enum methods
  addEnum() {
    this.protoFile.enums.push({
      name: 'NewEnum',
      values: [{ name: 'UNKNOWN', number: 0 }]
    });
    this.updateProtoPreview();
  }

  removeEnum(index: number) {
    this.protoFile.enums.splice(index, 1);
    this.updateProtoPreview();
  }

  addEnumValue(enumItem: Enum) {
    const nextNumber = Math.max(...enumItem.values.map(v => v.number), -1) + 1;
    enumItem.values.push({
      name: 'NEW_VALUE',
      number: nextNumber
    });
    this.updateProtoPreview();
  }

  removeEnumValue(enumItem: Enum, index: number) {
    enumItem.values.splice(index, 1);
    this.updateProtoPreview();
  }

  // Service methods
  addService() {
    this.protoFile.services.push({
      name: 'NewService',
      methods: []
    });
    this.updateProtoPreview();
  }

  removeService(index: number) {
    this.protoFile.services.splice(index, 1);
    this.updateProtoPreview();
  }

  addServiceMethod(service: Service) {
    service.methods.push({
      name: 'NewMethod',
      inputType: 'google.protobuf.Empty',
      outputType: 'google.protobuf.Empty',
      streaming: { input: false, output: false }
    });
    this.updateProtoPreview();
  }

  removeServiceMethod(service: Service, index: number) {
    service.methods.splice(index, 1);
    this.updateProtoPreview();
  }

  // Import methods
  addImport() {
    this.protoFile.imports.push('google/protobuf/empty.proto');
    this.updateProtoPreview();
  }

  removeImport(index: number) {
    this.protoFile.imports.splice(index, 1);
    this.updateProtoPreview();
  }

  // Tab switching
  setActiveTab(tab: 'messages' | 'enums' | 'services' | 'settings') {
    this.activeTab = tab;
  }

  updateProtoPreview() {
    let protoContent = `syntax = "${this.protoFile.syntax}";\n\n`;
    
    // Add package
    if (this.protoFile.package) {
      protoContent += `package ${this.protoFile.package};\n\n`;
    }
    
    // Add imports
    for (const importPath of this.protoFile.imports) {
      protoContent += `import "${importPath}";\n`;
    }
    if (this.protoFile.imports.length > 0) {
      protoContent += '\n';
    }
    
    // Add enums
    for (const enumItem of this.protoFile.enums) {
      protoContent += `enum ${enumItem.name} {\n`;
      for (const value of enumItem.values) {
        protoContent += `  ${value.name} = ${value.number};\n`;
      }
      protoContent += '}\n\n';
    }
    
    // Add messages
    for (const message of this.protoFile.messages) {
      protoContent += this.generateMessageContent(message, 0);
    }
    
    // Add services
    for (const service of this.protoFile.services) {
      protoContent += `service ${service.name} {\n`;
      for (const method of service.methods) {
        const inputStream = method.streaming?.input ? 'stream ' : '';
        const outputStream = method.streaming?.output ? 'stream ' : '';
        protoContent += `  rpc ${method.name}(${inputStream}${method.inputType}) returns (${outputStream}${method.outputType});\n`;
      }
      protoContent += '}\n\n';
    }
    
    this.code = protoContent;
  }

  private generateMessageContent(message: Message, indent: number): string {
    const spaces = '  '.repeat(indent);
    let content = `${spaces}message ${message.name} {\n`;
    
    // Add nested enums
    if (message.nestedEnums) {
      for (const nestedEnum of message.nestedEnums) {
        content += `${spaces}  enum ${nestedEnum.name} {\n`;
        for (const value of nestedEnum.values) {
          content += `${spaces}    ${value.name} = ${value.number};\n`;
        }
        content += `${spaces}  }\n\n`;
      }
    }
    
    // Add nested messages
    if (message.nestedMessages) {
      for (const nestedMessage of message.nestedMessages) {
        content += this.generateMessageContent(nestedMessage, indent + 1);
      }
    }
    
    // Add fields
    for (const field of message.fields) {
      const repeated = field.repeated ? 'repeated ' : '';
      const optional = field.optional ? 'optional ' : '';
      content += `${spaces}  ${repeated}${optional}${field.type} ${field.name} = ${field.number};\n`;
    }
    
    content += `${spaces}}\n\n`;
    return content;
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  toggleDownloadMenu() {
    this.showDownloadMenu = !this.showDownloadMenu;
  }

  downloadProto() {
    const baseFilename = this.getFilename();
    const filename = `${baseFilename}.proto`;
    const content = this.code;
    this.downloadFile(content, filename, 'text/plain');
    this.showDownloadMenu = false;
  }

  downloadJson() {
    const jsonData = {
      ...this.protoFile,
      title: this.specTitle,
      version: this.specVersion || "1.0.0",
      description: this.specDescription,
      generatedAt: new Date().toISOString()
    };

    const content = JSON.stringify(jsonData, null, 2);
    const baseFilename = this.getFilename();
    const filename = `${baseFilename}.json`;
    this.downloadFile(content, filename, 'application/json');
    this.showDownloadMenu = false;
  }

  private getFilename(): string {
    if (this.specTitle && this.specTitle.trim()) {
      // Replace spaces and special characters with underscores, remove invalid filename characters
      return this.specTitle.trim()
        .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/[^\w\-_.]/g, '') // Keep only word characters, hyphens, underscores, and dots
        .substring(0, 100); // Limit length to 100 characters
    }
    return 'Spec_Sheet';
  }

  private downloadFile(content: string, filename: string, contentType: string) {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
