import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NuMonacoEditorModule } from '@ng-util/monaco-editor';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService, ProtobufSpec, Team, MessageType } from '../services/api.service';
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
} from '../components/definition-details/definition-details';
import { MessageEnvelope } from '../components/message-envelope/message-envelope';
import { MessageTypesComponent } from '../components/message-types/message-types';
import { EditMessageType } from '../components/edit-message-type/edit-message-type';

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
  ],
  templateUrl: './editor.html',
  styleUrl: './editor.css',
  standalone: true,
})
export class EditorComponent implements OnInit {
  tabs = [
    { name: 'Specification Details', content: 'spec' },
    { name: 'Message Envelope', content: 'messageEnvelope' },
    { name: 'Message Types', content: 'messageTypes' },
  ];
  activeTabIndex = 0;
  showNewTabOverlay = false;
  newTabName = '';

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

  toggleChecked = false;
  toggleValue: 'protobuf' | 'json' = 'protobuf';
  specType: 'protobuf' | 'json' = 'protobuf';

  currentSpecId: string | null = null;
  currentSpec: ProtobufSpec | null = null;

  originalSpecData: ProtoFile | null = null;
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
          this.isPublished = !!spec.github_repo_url;

          this.githubRepoUrl = spec.github_repo_url || null;
          this.githubRepoName = spec.github_repo_name || null;

          this.specType = spec.spec_type;
          if (spec.spec_type === 'json') {
            this.toggleValue = 'json';
            this.toggleChecked = true;
            this.jsonSchema = spec.spec_data as any;
            this.messageTypes = []; // JSON specs don't have message types in this new architecture
            this.updateEditorContent();
          } else {
            this.toggleValue = 'protobuf';
            this.toggleChecked = false;
            this.protoFile = spec.spec_data;
            this.protoFile.messages = [];
            this.loadMessageTypes();
            this.updateEditorContent();
          }

          if (this.toggleValue === 'json') {
            this.originalSpecData = JSON.parse(JSON.stringify(this.jsonSchema));
          } else {
            // Not storing original protofile data as messages are fetched separately
          }
          this.originalVersion = spec.version;

          this.notificationService.success(
            'Specification Loaded',
            `Successfully loaded "${spec.title}" v${spec.version}`
          );
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

  loadMessageTypes() {
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
          }
        },
        error: (err) => {
          this.notificationService.error('Error', 'Failed to load message types.');
        },
      });
    }
  }

  goToDashboard() {
    this.router.navigate(['/']);
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
    // Logic to be implemented
  }
}
