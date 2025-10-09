import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NuMonacoEditorModule } from '@ng-util/monaco-editor';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService, ProtobufSpec, Team, MessageType, ProtoFileData } from '../services/api.service';
import { NotificationService } from '../services/notification.service';
import { parse } from 'proto-parser';
import { PublishModalComponent } from '../components/publish-modal/publish-modal.component';
import { PushToBranchModalComponent } from '../components/push-to-branch-modal/push-to-branch-modal.component';
import { SpecificationDetailsComponent } from '../components/specification-details/specification-details.component';
import {
  DefinitionDetailsComponent,
  Message,
  ProtoFile,
  JsonSchema,
  JsonField,
  Field,
  Enum,
  Service,
  JsonSchemaProperty,
} from '../components/definition-details/definition-details';
import { MessageEnvelope } from '../components/message-envelope/message-envelope';
import { MessageTypesComponent } from '../components/message-types/message-types';
import { EditMessageType } from '../components/edit-message-type/edit-message-type';
import { TabListOverlayComponent } from '../components/tab-list-overlay/tab-list-overlay.component';

@Component({
  selector: 'app-editor',
  imports: [
    CommonModule,
    FormsModule,
    NuMonacoEditorModule,
    PublishModalComponent,
    PushToBranchModalComponent,
    SpecificationDetailsComponent,
    MessageEnvelope,
    MessageTypesComponent,
    EditMessageType,
    TabListOverlayComponent,
  ],
  templateUrl: './editor.html',
  styleUrl: './editor.css',
  standalone: true,
})
export class EditorComponent implements OnInit {
  @ViewChild(SpecificationDetailsComponent) specDetailsComponent!: SpecificationDetailsComponent;
  tabs = [
    { name: 'Specification Details', content: 'spec' },
    { name: 'Message Envelope', content: 'messageEnvelope' },
    { name: 'Message Types', content: 'messageTypes' },
  ];
  activeTabIndex = 0;
  showNewTabOverlay = false;
  newTabName = '';
  showTabListOverlay = false;

  // Save All and Version Increment properties
  showVersionIncrementModal = false;
  selectedVersionIncrement: 'patch' | 'minor' | 'major' | 'custom' | null = null;
  customVersion = '';
  
  // Change tracking
  originalSpecData: any = null;
  originalMessageEnvelopes: any[] = [];
  originalMessageTypes: any[] = [];

  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('downloadButton') downloadButton!: ElementRef;
  @ViewChild('downloadMenu') downloadMenu!: ElementRef;

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
  code: string = 'syntax = "proto3";';

  specTitle: string = '';
  specVersion: string = '';
  specDescription: string = '';
  specTags: string = '';
  deviceName: string = '';
  protocols: string[] = [];
  documentStatus: string = '';
  forField: string = '';

  isSavingDetails = false;

  toggleChecked = false;
  toggleValue: 'protobuf' | 'json' = 'protobuf';
  specType: 'protobuf' | 'json' = 'protobuf';

  currentSpecId: string | null = null;
  currentSpec: ProtobufSpec | null = null;

  originalVersion: string | null = null;

  githubRepoUrl: string | null = null;
  githubRepoName: string | null = null;

  isSaving: boolean = false;
  isLoading: boolean = false;
  isPublished: boolean = false;
  showPublishModal: boolean = false;
  showPushToBranchModal: boolean = false;
  editingMessage: MessageType | null = null;
  lastSelectedMessageId: string | null = null;

  myTeams: Team[] = [];
  selectedTeamId: string | 'personal' = 'personal';

  protoFile: ProtoFile = {
    syntax: 'proto3',
    package: '',
    imports: [],
    messages: [],
    enums: [],
    services: [],
  };
  showDownloadMenu: boolean = false;
  activeTab: 'messages' | 'enums' | 'services' | 'settings' = 'messages';

  jsonSchema: JsonSchema = {
    title: 'StatusUpdate',
    type: 'object',
    properties: {},
    required: [],
  };
  jsonFields: JsonField[] = [];
  messageTypes: MessageType[] = [];
  messageEnvelopes: any[] = [];
  selectedEnvelopeId: string | null = null;
  combinedPayloadText: string = '';

  showJsonDemoOverlay: boolean = false;
  demoJsonText: string = '';

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.showDownloadMenu) {
      const clickedInsideButton = this.downloadButton.nativeElement.contains(event.target);
      const clickedInsideMenu =
        this.downloadMenu && this.downloadMenu.nativeElement.contains(event.target);
      if (!clickedInsideButton && !clickedInsideMenu) {
        this.showDownloadMenu = false;
      }
    }
  }

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.updateEditorContent();
    this.loadMyTeams();

    this.route.queryParams.subscribe((params) => {
      if (params['id']) {
        this.loadSpec(params['id'], params['version']);
      }
    });
  }

  loadMessageEnvelopes(callback?: () => void) {
    this.apiService.getMessageEnvelopes().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.messageEnvelopes = response.data;
        }
        if (callback) callback();
      },
      error: (err) => {
        console.error('Failed to load message envelopes', err);
        if (callback) callback();
      },
    });
  }

  openNewTabDialog() {
    this.showNewTabOverlay = true;
  }

  closeNewTabDialog() {
    this.showNewTabOverlay = false;
    this.newTabName = '';
  }

  addNewTab() {
    if (this.newTabName.trim()) {
      this.tabs.push({ name: this.newTabName, content: 'new' });
      this.activeTabIndex = this.tabs.length - 1;
      this.closeNewTabDialog();
    }
  }

  loadMyTeams() {
    this.apiService.getTeams().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.myTeams = response.data;
        }
      },
      error: (err) => {
        console.error('Failed to load teams', err);
      },
    });
  }

  loadSpec(specId: string, version?: string) {
    this.isLoading = true;
    this.currentSpecId = specId;

    this.apiService.getSpec(specId, version).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          const spec = response.data;
          this.currentSpec = spec;

          this.specTitle = spec.title;
          this.specVersion = spec.version;
          this.specDescription = spec.description || '';
          this.specTags = spec.tags?.join(', ') || '';
          this.deviceName = spec.device_name || '';
          this.protocols = spec.protocols || [];
          this.documentStatus = spec.document_status || '';
          this.forField = spec.for_field || '';
          this.isPublished = !!spec.github_repo_url;

          this.githubRepoUrl = spec.github_repo_url || null;
          this.githubRepoName = spec.github_repo_name || null;

          this.specType = spec.spec_type;
          this.updateEditorContent();

          this.notificationService.success(
            'Specification Loaded',
            `Successfully loaded "${spec.title}" v${spec.version}`
          );

          // Chain all data loading and initialize at the very end.
          this.loadMessageEnvelopes(() => {
            this.loadMessageTypes(() => {
              this.initializeOriginalData();
            });
          });

        } else {
          this.notificationService.error(
            'Load Failed',
            response.error || 'Failed to load specification'
          );
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Load error:', error);
        this.notificationService.error(
          'Load Error',
          'Failed to load specification. Please check your connection and try again.'
        );
      },
    });
  }

  loadMessageTypes(callback?: () => void) {
    if (this.currentSpecId) {
      this.apiService.getMessageTypes(this.currentSpecId).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.messageTypes = response.data;
            // Build proto preview fields from JSON Schema (supports both legacy fields[] and properties/required)
            this.protoFile.messages = response.data.map((mt) => {
              const schema: any = mt.json_schema || {};
              let fields: any[] = [];
              if (Array.isArray(schema?.fields)) {
                fields = schema.fields;
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
                  const itemType = isArray ? prop.items?.type || 'string' : prop.type || 'string';
                  return {
                    name: key,
                    type: toProtoType(itemType),
                    number: counter++,
                    repeated: !!isArray,
                    optional: required.indexOf(key) === -1,
                  };
                });
              }
              return { name: mt.name, fields };
            });
            this.updateProtoPreview();
            if (callback) {
              callback();
            }
          }
        },
        error: (err) => {
          this.notificationService.error('Error', 'Failed to load message types.');
        },
      });
    } else {
      if (callback) {
        callback();
      }
    }
  }

  goToDashboard() {
    // Force dashboard to reload by navigating with a timestamp query param
    this.router.navigate(['/'], { 
      queryParams: { refresh: Date.now() },
      queryParamsHandling: 'replace' // Use replace instead of merge to ensure clean navigation
    });
  }

  setActiveTab(tab: 'messages' | 'enums' | 'services' | 'settings') {
    this.activeTab = tab;
  }

  onTabChange(index: number) {
    this.activeTabIndex = index;
    if (this.tabs[index].content === 'messageTypes') {
      this.loadMessageTypes();
    }
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
    }
  }

  updateProtoPreview() {
    let protoContent = `syntax = "${this.protoFile.syntax}";\n\n`;

    if (this.protoFile.package) {
      protoContent += `package ${this.protoFile.package};\n\n`;
    }

    for (const importPath of this.protoFile.imports) {
      protoContent += `import "${importPath}";\n`;
    }
    if (this.protoFile.imports.length > 0) {
      protoContent += '\n';
    }

    for (const enumItem of this.protoFile.enums) {
      protoContent += `enum ${enumItem.name} {\n`;
      for (const value of enumItem.values) {
        protoContent += `  ${value.name} = ${value.number};\n`;
      }
      protoContent += '}\n\n';
    }

    for (const message of this.protoFile.messages) {
      protoContent += this.generateMessageContent(message, 0);
    }

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

    if (message.nestedEnums) {
      for (const nestedEnum of message.nestedEnums) {
        content += `${spaces}  enum ${nestedEnum.name} {\n`;
        for (const value of nestedEnum.values) {
          content += `${spaces}    ${value.name} = ${value.number};\n`;
        }
        content += `${spaces}  }\n\n`;
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
      version: this.specVersion || '1.0.0',
      description: this.specDescription,
      generatedAt: new Date().toISOString(),
    };

    const content = JSON.stringify(jsonData, null, 2);
    const baseFilename = this.getFilename();
    const filename = `${baseFilename}.json`;
    this.downloadFile(content, filename, 'application/json');
    this.showDownloadMenu = false;
  }

  private getFilename(): string {
    if (this.specTitle && this.specTitle.trim()) {
      return this.specTitle
        .trim()
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^\w\-_.]/g, '')
        .substring(0, 100);
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

  saveSpec() {
    if (!this.specTitle.trim()) {
      this.notificationService.warning(
        'Title Required',
        'Please enter a specification title before saving'
      );
      return;
    }

    this.isSaving = true;

    let finalVersion = this.specVersion || '1.0.0';
    if (this.shouldAutoIncrementVersion()) {
      finalVersion = this.incrementVersion(finalVersion);
      this.specVersion = finalVersion;
    }

    const teamIdToSend =
      !this.currentSpecId && this.selectedTeamId !== 'personal'
        ? this.selectedTeamId
        : this.currentSpec?.team_id ?? undefined;

    const specData: any = {
      title: this.specTitle.trim(),
      version: finalVersion,
      description: this.specDescription || '',
      spec_type: this.toggleValue,
      spec_data: this.toggleValue === 'protobuf' ? this.protoFile : this.jsonSchema,
      tags: this.specTags
        ? this.specTags
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag)
        : [],
      team_id: teamIdToSend,
      github_repo_url: this.githubRepoUrl,
      github_repo_name: this.githubRepoName,
    };

    const versionChanged =
      this.currentSpecId && this.originalVersion && this.originalVersion !== finalVersion;

    const saveOperation =
      this.currentSpecId && !versionChanged
        ? this.apiService.updateSpec(this.currentSpecId, specData)
        : this.apiService.createSpec(specData);

    const wasUpdate = this.currentSpecId !== null && !versionChanged;
    const isNewVersion = this.currentSpecId !== null && versionChanged;
    const versionWasIncremented = this.shouldAutoIncrementVersion();

    saveOperation.subscribe({
      next: (response) => {
        this.isSaving = false;
        if (response.success && response.data) {
          this.currentSpecId = response.data.id!;

          if (this.toggleValue === 'json') {
            this.originalSpecData = JSON.parse(JSON.stringify(this.jsonSchema));
          } else {
            // Not storing original protofile data as messages are fetched separately
          }
          this.originalVersion = finalVersion;

          let title: string = '';
          let message: string = '';

          if (isNewVersion) {
            title = 'New Version Created';
            message = `"${this.specTitle}" v${finalVersion} has been created as a new version`;
          } else if (wasUpdate) {
            title = 'Specification Updated';
            message = `"${this.specTitle}" has been updated successfully`;
            if (versionWasIncremented) {
              message += ` with version automatically incremented to ${finalVersion}`;
            }
          } else {
            title = 'Specification Saved';
            message = `"${this.specTitle}" has been saved successfully`;
          }

          this.notificationService.success(title, message);
        } else {
          this.notificationService.error(
            'Save Failed',
            response.error || 'Failed to save specification'
          );
        }
      },
      error: (error) => {
        this.isSaving = false;
        console.error('Save error:', error);
        this.notificationService.error(
          'Save Error',
          'Failed to save specification. Please check your connection and try again.'
        );
      },
    });
  }

  hasSpecDataChanged(): boolean {
    if (!this.originalSpecData) {
      return false;
    }

    if (this.toggleValue === 'json') {
      return JSON.stringify(this.originalSpecData) !== JSON.stringify(this.jsonSchema);
    }

    // Message types are now handled separately
    return false;
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.').map((part) => parseInt(part) || 0);

    while (parts.length < 3) {
      parts.push(0);
    }

    parts[parts.length - 1]++;

    return parts.join('.');
  }

  shouldAutoIncrementVersion(): boolean {
    return this.currentSpecId !== null && this.hasSpecDataChanged() && this.hasVersionNotChanged();
  }

  private hasVersionNotChanged(): boolean {
    const currentVersion = this.specVersion || '1.0.0';
    const originalVersion = this.originalVersion || '1.0.0';
    return currentVersion === originalVersion;
  }

  getNextVersion(): string {
    if (this.shouldAutoIncrementVersion()) {
      return this.incrementVersion(this.specVersion || '1.0.0');
    }
    return this.specVersion || '1.0.0';
  }

  handlePublishOrCommit() {
    if (this.isPublished) {
      this.openPushToBranchModal();
    } else {
      this.openPublishModal();
    }
  }

  openPublishModal() {
    this.showPublishModal = true;
  }

  closePublishModal() {
    this.showPublishModal = false;
  }

  handlePublish(event: any) {
    if (!this.currentSpecId) return;

    this.apiService.publishToGithub(this.currentSpecId, event).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success(
            'Published to GitHub!',
            `Successfully created repository: ${response.data.url}`
          );
          this.closePublishModal();
          this.loadSpec(this.currentSpecId!);
        } else {
          this.notificationService.error(
            'Publish Failed',
            response.error || 'Could not publish to GitHub.'
          );
        }
      },
      error: (error) => {
        this.notificationService.error(
          'Publish Error',
          error.error.error || 'An unknown error occurred.'
        );
      },
    });
  }

  openPushToBranchModal() {
    this.showPushToBranchModal = true;
  }

  closePushToBranchModal() {
    this.showPushToBranchModal = false;
  }

  handlePushToBranch(event: any) {
    if (!this.currentSpecId) return;

    this.apiService.pushToBranch(this.currentSpecId, event.commitMessage).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success(
            'Pushed to GitHub!',
            `Successfully pushed updates to ${this.currentSpec?.github_repo_name}.`
          );
          this.closePushToBranchModal();
        } else {
          this.notificationService.error(
            'Push Failed',
            response.error || 'Could not push to GitHub.'
          );
        }
      },
      error: (error) => {
        this.notificationService.error(
          'Push Error',
          error.error.error || 'An unknown error occurred.'
        );
      },
    });
  }

  handleEditMessage(message: MessageType) {
    // Remember which message was edited so we can restore selection on return
    this.lastSelectedMessageId = message.id || null;

    // Open edit view immediately with current data
    const fallback = this.messageTypes.find((m) => m.id === message.id) || message;
    this.editingMessage = JSON.parse(JSON.stringify(fallback));

    // Then refresh from API in background to ensure it's up-to-date
    if (this.currentSpecId) {
      this.apiService.getMessageTypes(this.currentSpecId).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.messageTypes = response.data;
            const fresh = this.messageTypes.find((m) => m.id === message.id) || fallback;
            this.editingMessage = JSON.parse(JSON.stringify(fresh));
          }
        },
        error: () => {
          // Keep the fallback if refresh fails
        },
      });
    }
  }

  handleDoneEditing() {
    this.editingMessage = null;
    this.loadMessageTypes();
  }

  handleAddMessage() {
    this.loadMessageTypes();
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
        const ast = parse(content) as any;
        this.fromAst(ast);
        this.notificationService.success('Spec Uploaded', 'Successfully parsed .proto file.');
        this.updateEditorContent();
      } catch (error: any) {
        this.notificationService.error(
          'Parse Error',
          `Failed to parse .proto file: ${error.message}`
        );
      }
    };
    reader.readAsText(file);
  }

  fromAst(ast: any) {
    if (ast.syntax) {
      this.protoFile.syntax = ast.syntax;
    }

    if (ast.package) {
      this.protoFile.package = ast.package;
    }

    this.protoFile.imports = ast.imports || [];
    this.protoFile.messages = [];
    this.protoFile.enums = [];
    this.protoFile.services = [];

    if (ast.root && ast.root.nested) {
      for (const key in ast.root.nested) {
        const nestedItem = ast.root.nested[key];
        if (nestedItem.fields) {
          this.protoFile.messages.push(this.messageFromAst(nestedItem));
        } else if (nestedItem.values) {
          this.protoFile.enums.push(this.enumFromAst(nestedItem));
        } else if (nestedItem.methods) {
          this.protoFile.services.push(this.serviceFromAst(nestedItem));
        }
      }
    }
  }

  messageFromAst(ast: any): Message {
    const message: Message = {
      name: ast.name,
      fields: [],
    };

    if (ast.fields) {
      for (const key in ast.fields) {
        const field = ast.fields[key];
        message.fields.push({
          type: field.type,
          name: field.name,
          number: field.id,
          repeated: field.repeated,
          optional: field.optional,
        });
      }
    }

    return message;
  }

  enumFromAst(ast: any): Enum {
    const enumDef: Enum = {
      name: ast.name,
      values: [],
    };

    if (ast.values) {
      for (const key in ast.values) {
        const value = ast.values[key];
        enumDef.values.push({
          name: key,
          number: value,
        });
      }
    }

    return enumDef;
  }

  serviceFromAst(ast: any): Service {
    const service: Service = {
      name: ast.name,
      methods: [],
    };

    if (ast.methods) {
      for (const key in ast.methods) {
        const method = ast.methods[key];
        service.methods.push({
          name: method.name,
          inputType: method.requestType,
          outputType: method.responseType,
          streaming: {
            input: method.requestStream || false,
            output: method.responseStream || false,
          },
        });
      }
    }

    return service;
  }

  showPdf() {
    this.loadMessageTypes(() => {
      this.showTabListOverlay = true;
    });
    console.log("Kamalesh")
  }

  closeTabListOverlay() {
    this.showTabListOverlay = false;
  }

  onEnvelopeSelected(envelopeId: string) {
    this.selectedEnvelopeId = envelopeId;
    const selectedEnvelope = this.messageEnvelopes.find(e => e.id === envelopeId);
    if (selectedEnvelope) {
      this.demoJsonText = JSON.stringify(this.generateDemoFromFields(selectedEnvelope.json_fields), null, 2);
    } else {
      this.demoJsonText = '';
    }
  }

  onMessageTypeSelected(messageType: MessageType) {
    if (!this.selectedEnvelopeId) {
      this.combinedPayloadText = '';
      return;
    }
    const selectedEnvelope = this.messageEnvelopes.find(e => e.id === this.selectedEnvelopeId);
    if (!selectedEnvelope) {
      this.combinedPayloadText = '';
      return;
    }

    const envelopePayload = this.generateDemoFromFields(selectedEnvelope.json_fields);
    const messagePayload = this.generateDemoJson(messageType.json_schema);
    const messageKey = this.toCamelCase(messageType.name);

    const combinedJson = {
      ...envelopePayload,
      [messageKey]: messagePayload
    };

    this.combinedPayloadText = JSON.stringify(combinedJson, null, 2);
  }

  private toCamelCase(str: string): string {
    if (!str) return '';
    return str.replace(/[^a-zA-Z0-9]+(.)?/g, (match, chr) => chr ? chr.toUpperCase() : '').replace(/^./, (match) => match.toLowerCase());
  }

  private generateDemoJson(schema: any): any {
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

  saveSpecDetailsOnly() {
    if (!this.currentSpecId) {
      this.notificationService.warning('No Spec Loaded', 'Please load a specification before saving.');
      return;
    }

    this.isSavingDetails = true;

    // Use the same logic as saveSpecificationDetails for consistency
    this.saveSpecificationDetails()
      .then(() => {
        this.isSavingDetails = false;
        const versionChanged = this.hasVersionChanged();
        this.notificationService.success(
          'Success', 
          versionChanged 
            ? `Created new version "${this.specTitle}" v${this.specVersion} with your changes!`
            : 'Specification details saved successfully!'
        );
        
        // Update original data to reflect current state
        this.updateOriginalData();
        
        // Refresh the current spec to ensure we have the latest data
        if (this.currentSpecId) {
          this.refreshCurrentSpec();
        }
      })
      .catch((error) => {
        this.isSavingDetails = false;
        this.notificationService.error('Error', 'Error saving specification details.');
        console.error('Error saving spec details:', error);
      });
  }

  // ===== SAVE ALL & VERSION INCREMENT METHODS =====

  saveAll() {
    if (!this.hasAnyChanges()) {
      this.notificationService.info('No Changes', 'No changes detected to save.');
      return;
    }

    // Check if version was manually changed
    if (this.hasVersionChanged()) {
      // Version was manually changed, proceed with save
      this.performSaveAll();
    } else {
      // Version not changed, show increment modal
      this.showVersionIncrementModal = true;
      this.selectedVersionIncrement = 'patch'; // Default to patch
    }
  }

  hasAnyChanges(): boolean {
    return this.hasSpecificationDetailsChanges() || 
           this.hasMessageEnvelopeChanges() || 
           this.hasMessageTypesChanges();
  }

  hasSpecificationDetailsChanges(): boolean {
    if (!this.originalSpecData) return false;
    
    return this.specTitle !== this.originalSpecData.title ||
           this.specVersion !== this.originalSpecData.version ||
           this.specDescription !== this.originalSpecData.description ||
           this.specTags !== (this.originalSpecData.tags || []).join(', ') ||
           this.deviceName !== this.originalSpecData.device_name ||
           JSON.stringify(this.protocols) !== JSON.stringify(this.originalSpecData.protocols || []) ||
           this.documentStatus !== this.originalSpecData.document_status ||
           this.forField !== this.originalSpecData.for_field;
  }

  hasMessageEnvelopeChanges(): boolean {
    // Compare current message envelopes with original
    return JSON.stringify(this.messageEnvelopes) !== JSON.stringify(this.originalMessageEnvelopes);
  }

  hasMessageTypesChanges(): boolean {
    // Compare current message types with original
    return JSON.stringify(this.messageTypes) !== JSON.stringify(this.originalMessageTypes);
  }

  onMessageEnvelopeChanged(): void {
    // This method is called when the message envelope component emits dataChanged
    // It triggers change detection for the message envelope tab
    console.log('Message envelope data changed');
  }

  onMessageTypesChanged(): void {
    // This method is called when the message types component emits dataChanged
    // It triggers change detection for the message types tab
    console.log('Message types data changed');
  }

  hasVersionChanged(): boolean {
    if (!this.originalSpecData) return false;
    const changed = this.specVersion !== this.originalSpecData.version;
    console.log('hasVersionChanged:', changed, 'current:', this.specVersion, 'original:', this.originalSpecData.version);
    return changed;
  }

  getChangedTabsCount(): number {
    let count = 0;
    if (this.hasSpecificationDetailsChanges()) count++;
    if (this.hasMessageEnvelopeChanges()) count++;
    if (this.hasMessageTypesChanges()) count++;
    return count;
  }

  // Version increment modal methods
  selectVersionIncrement(type: 'patch' | 'minor' | 'major' | 'custom') {
    this.selectedVersionIncrement = type;
    if (type !== 'custom') {
      this.customVersion = '';
    }
  }

  getIncrementedVersion(type: 'patch' | 'minor' | 'major'): string {
    const currentVersion = this.specVersion || '1.0.0';
    const parts = currentVersion.split('.').map(Number);
    
    // Ensure we have at least 3 parts
    while (parts.length < 3) {
      parts.push(0);
    }

    switch (type) {
      case 'patch':
        parts[2]++;
        break;
      case 'minor':
        parts[1]++;
        parts[2] = 0;
        break;
      case 'major':
        parts[0]++;
        parts[1] = 0;
        parts[2] = 0;
        break;
    }

    return parts.join('.');
  }

  closeVersionIncrementModal() {
    this.showVersionIncrementModal = false;
    this.selectedVersionIncrement = null;
    this.customVersion = '';
  }

  proceedWithVersionIncrement() {
    if (!this.selectedVersionIncrement) return;

    let newVersion: string;
    if (this.selectedVersionIncrement === 'custom') {
      newVersion = this.customVersion;
    } else {
      newVersion = this.getIncrementedVersion(this.selectedVersionIncrement);
    }

    // Update the version
    this.specVersion = newVersion;
    
    // Close modal
    this.closeVersionIncrementModal();
    
    // Perform the save
    this.performSaveAll();
  }

  performSaveAll() {
    this.isSaving = true;
    
    // Save specification details first
    this.saveSpecificationDetails()
      .then(() => {
        // Then save message envelopes if changed
        if (this.hasMessageEnvelopeChanges()) {
          return this.saveMessageEnvelopes();
        }
        return Promise.resolve();
      })
      .then(() => {
        // Then save message types if changed
        if (this.hasMessageTypesChanges()) {
          return this.saveMessageTypes();
        }
        return Promise.resolve();
      })
      .then(() => {
        this.isSaving = false;
        const versionChanged = this.hasVersionChanged();
        this.notificationService.success(
          'All Changes Saved', 
          versionChanged 
            ? `Created new version "${this.specTitle}" v${this.specVersion}. Dashboard will show the new version.`
            : `Updated "${this.specTitle}" v${this.specVersion}. Dashboard will show updated data when you return.`
        );
        
        // Update original data to reflect current state
        this.updateOriginalData();
        
        // Refresh the current spec to ensure we have the latest data
        if (this.currentSpecId) {
          this.refreshCurrentSpec();
        }
      })
      .catch((error) => {
        this.isSaving = false;
        this.notificationService.error('Error', 'Failed to save some changes. Please try again.');
        console.error('Save all error:', error);
      });
  }

  private saveSpecificationDetails(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.currentSpecId) {
        reject('No spec ID');
        return;
      }

      const specDetails: Partial<ProtobufSpec> = {
        title: this.specTitle,
        version: this.specVersion,
        description: this.specDescription,
        tags: this.specTags.split(',').map(tag => tag.trim()).filter(tag => tag),
        device_name: this.deviceName,
        protocols: this.protocols,
        document_status: this.documentStatus,
        for_field: this.forField,
      };

      console.log('Current form values:', {
        deviceName: this.deviceName,
        protocols: this.protocols,
        documentStatus: this.documentStatus,
        forField: this.forField,
        specTitle: this.specTitle,
        specVersion: this.specVersion
      });

      // Check if version has changed - if so, create new version, otherwise update existing
      const versionChanged = this.hasVersionChanged();
      console.log('Version changed:', versionChanged, 'Current:', this.specVersion, 'Original:', this.originalSpecData?.version);
      
      if (versionChanged) {
        // Version changed - create new spec version
        // Copy ALL data from current spec to preserve everything
        const freshData = this.specDetailsComponent;
        const newSpecData: Omit<ProtobufSpec, 'id'> = {
          title: freshData.specTitle,
          version: this.specVersion, // Version is handled by the parent component's modal flow
          description: freshData.specDescription,
          tags: freshData.specTags.split(',').map(tag => tag.trim()).filter(tag => tag),
          device_name: freshData.deviceName,
          protocols: freshData.protocols,
          document_status: freshData.documentStatus,
          for_field: freshData.forField,
          spec_data: this.currentSpec?.spec_data || this.getDefaultProtoFileData(),
          spec_type: this.currentSpec?.spec_type || 'protobuf',
          team_id: this.currentSpec?.team_id || null,
          github_repo_url: this.currentSpec?.github_repo_url || undefined,
          github_repo_name: this.currentSpec?.github_repo_name || undefined,
          created_at: new Date(),
          updated_at: new Date(),
        };

        console.log('New spec data being created:', {
          device_name: newSpecData.device_name,
          protocols: newSpecData.protocols,
          document_status: newSpecData.document_status,
          for_field: newSpecData.for_field,
          title: newSpecData.title,
          version: newSpecData.version
        });

        this.apiService.createSpec(newSpecData).subscribe({
          next: (response) => {
            if (response.success && response.data) {
              const newSpecId = response.data.id!;
              const oldSpecId = this.currentSpecId;
              
              // Update current spec reference to the new version
              this.currentSpecId = newSpecId;
              this.currentSpec = response.data;
              console.log('Created new spec version:', response.data.version);
              console.log('New spec data received:', {
                device_name: response.data.device_name,
                protocols: response.data.protocols,
                document_status: response.data.document_status,
                for_field: response.data.for_field,
                title: response.data.title,
                version: response.data.version
              });
              
              // Copy message types from old version to new version
              console.log('About to copy message types. Current message types:', this.messageTypes?.length || 0);
              console.log('Current message types data:', this.messageTypes);
              console.log('Old spec ID:', oldSpecId, 'New spec ID:', newSpecId);
              if (oldSpecId) {
                // Ensure message types are loaded before copying
                if (!this.messageTypes || this.messageTypes.length === 0) {
                  console.log('Message types not loaded, loading them first...');
                  this.apiService.getMessageTypes(oldSpecId).subscribe({
                    next: (response) => {
                      if (response.success && response.data) {
                        console.log('Loaded message types for copying:', response.data.length);
                        this.messageTypes = response.data;
                        this.copyMessageTypesToNewVersion(oldSpecId, newSpecId);
                      } else {
                        console.log('No message types found to copy');
                      }
                    },
                    error: (error) => {
                      console.error('Error loading message types for copying:', error);
                    }
                  });
                } else {
                  this.copyMessageTypesToNewVersion(oldSpecId, newSpecId);
                }
              } else {
                console.log('No old spec ID available, skipping message type copying');
              }
              
              // Update the URL to reflect the new spec ID
              this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { id: this.currentSpecId },
                queryParamsHandling: 'merge',
                replaceUrl: true
              });
              
              // Reload the spec to ensure all form fields are properly populated
              // Wait longer to ensure message types are fully copied
              setTimeout(() => {
                console.log('Reloading spec after message type copying...');
                this.loadSpec(newSpecId);
              }, 2000); // Give more time for message types to be copied
            }
            resolve();
          },
          error: (error) => {
            console.error('Error creating new spec version:', error);
            reject(error);
          }
        });
      } else {
        // Version unchanged - update existing spec
        this.apiService.updateSpecDetails(this.currentSpecId, specDetails).subscribe({
          next: (updatedSpec) => {
            if (updatedSpec.data) {
              this.currentSpec = updatedSpec.data;
              console.log('Updated existing spec:', updatedSpec.data.version);
            }
            resolve();
          },
          error: (error) => {
            console.error('Error updating spec details:', error);
            reject(error);
          }
        });
      }
    });
  }

  private saveMessageEnvelopes(): Promise<void> {
    // This would need to be implemented based on your message envelope save logic
    return Promise.resolve();
  }

  private saveMessageTypes(): Promise<void> {
    // This would need to be implemented based on your message types save logic
    return Promise.resolve();
  }

  private updateOriginalData() {
    // Update original data to current state
    this.originalSpecData = {
      title: this.specTitle,
      version: this.specVersion,
      description: this.specDescription,
      tags: this.specTags.split(',').map(tag => tag.trim()).filter(tag => tag),
      device_name: this.deviceName,
      protocols: [...this.protocols],
      document_status: this.documentStatus,
      for_field: this.forField,
    };
    
    this.originalMessageEnvelopes = JSON.parse(JSON.stringify(this.messageEnvelopes));
    this.originalMessageTypes = JSON.parse(JSON.stringify(this.messageTypes));
  }

  private initializeOriginalData() {
    this.originalSpecData = {
      title: this.specTitle,
      version: this.specVersion,
      description: this.specDescription,
      tags: this.specTags.split(',').map(tag => tag.trim()).filter(tag => tag),
      device_name: this.deviceName,
      protocols: [...this.protocols],
      document_status: this.documentStatus,
      for_field: this.forField,
    };
    
    // Initialize message envelopes and types (will be updated when they're loaded)
    this.originalMessageEnvelopes = JSON.parse(JSON.stringify(this.messageEnvelopes));
    this.originalMessageTypes = JSON.parse(JSON.stringify(this.messageTypes));
  }

  private refreshCurrentSpec(): void {
    if (!this.currentSpecId) return;
    
    // Silently refresh the current spec data to ensure we have the latest version
    this.apiService.getSpec(this.currentSpecId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.currentSpec = response.data;
          // Update the original version to match what's now in the database
          this.originalVersion = response.data.version;
        }
      },
      error: (error) => {
        console.error('Error refreshing spec data:', error);
      }
    });
  }

  private getDefaultProtoFileData(): ProtoFileData {
    return {
      syntax: 'proto3',
      package: '',
      imports: [],
      messages: [],
      enums: [],
      services: []
    };
  }

  private updateOriginalMessageEnvelopes(): void {
    this.originalMessageEnvelopes = JSON.parse(JSON.stringify(this.messageEnvelopes));
  }

  private updateOriginalMessageTypes(): void {
    this.originalMessageTypes = JSON.parse(JSON.stringify(this.messageTypes));
  }

  private copyMessageTypesToNewVersion(oldSpecId: string, newSpecId: string): void {
    // Copy all message types from the old version to the new version
    if (this.messageTypes && this.messageTypes.length > 0) {
      console.log(`Copying ${this.messageTypes.length} message types to new version`);
      
      // Copy each message type one by one
      let copiedCount = 0;
      const totalCount = this.messageTypes.length;
      
      this.messageTypes.forEach((messageType, index) => {
        const newMessageType = {
          name: messageType.name,
          json_schema: messageType.json_schema
        };
        
        console.log(`Copying message type ${index + 1}/${totalCount}:`, messageType.name);
        
        this.apiService.createMessageType(newSpecId, newMessageType).subscribe({
          next: (response) => {
            if (response.success) {
              copiedCount++;
              console.log(`Successfully copied message type: ${messageType.name} (${copiedCount}/${totalCount})`);
              
              // If this is the last one, just log completion
              if (copiedCount === totalCount) {
                console.log('All message types copied successfully!');
                // Don't reload here - let the main spec reload handle it
              }
            } else {
              console.error(`Failed to copy message type ${messageType.name}:`, response);
            }
          },
          error: (error) => {
            console.error(`Error copying message type ${messageType.name}:`, error);
            this.notificationService.error('Error', `Failed to copy message type: ${messageType.name}`);
          }
        });
      });
    } else {
      console.log('No message types to copy to new version');
    }
  }
}
