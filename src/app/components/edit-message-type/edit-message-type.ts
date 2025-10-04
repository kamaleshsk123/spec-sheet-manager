import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DefinitionDetailsComponent,
  ProtoFile,
  JsonSchema,
  JsonField,
} from '../definition-details/definition-details';

interface MessageType {
  id: number;
  name: string;
  payloadDefinition?: string;
  json: any | null;
  fields: JsonField[];
}

@Component({
  selector: 'app-edit-message-type',
  imports: [CommonModule, FormsModule, DefinitionDetailsComponent],
  templateUrl: './edit-message-type.html',
  styleUrl: './edit-message-type.css',
})
export class EditMessageType {
  @Input() message: MessageType | null = null;
  @Output() done = new EventEmitter<MessageType>();
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

  ngOnInit() {
    if (this.message) {
      this.jsonFields = this.message.fields;
    }
  }

  onDone() {
    if (this.message) {
      this.message.fields = this.jsonFields;
      this.done.emit(this.message);
    }
  }
}
