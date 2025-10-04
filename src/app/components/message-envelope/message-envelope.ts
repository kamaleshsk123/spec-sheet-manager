import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DefinitionDetailsComponent,
  ProtoFile,
  JsonSchema,
  JsonField,
} from '../definition-details/definition-details';

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

  ngOnInit() {
    this.jsonFields = [
      { name: 'imei', type: 'number', is_required: true, digits: 15, children: [], items: { type: 'string', children: [] } },
      { name: 'event_ts', type: 'time', is_required: true, children: [], items: { type: 'string', children: [] } },
      { name: 'message-type', type: 'number', is_required: true, children: [], items: { type: 'string', children: [] } },
      { name: 'sequence', type: 'number', is_required: true, children: [], items: { type: 'string', children: [] } },
      { name: 'csq-dbm', type: 'number', is_required: true, children: [], items: { type: 'string', children: [] } },
      { name: 'rat_code', type: 'number', is_required: true, children: [], items: { type: 'string', children: [] } },
      { name: 'cmd_id', type: 'number', is_required: true, children: [], items: { type: 'string', children: [] } },
    ];
  }
}
