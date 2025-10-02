import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DefinitionDetailsComponent, ProtoFile, JsonSchema, JsonField } from '../definition-details/definition-details';

@Component({
  selector: 'app-message-envelope',
  standalone: true,
  imports: [CommonModule, FormsModule, DefinitionDetailsComponent],
  templateUrl: './message-envelope.html',
  styleUrl: './message-envelope.css',
})
export class MessageEnvelope {
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

  ngOnInit() {
    // console.log('MessageEnvelope component initialized');
  }
}
