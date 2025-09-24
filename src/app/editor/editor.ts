import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NuMonacoEditorModule } from '@ng-util/monaco-editor';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService, ProtobufSpec } from '../services/api.service';
import { NotificationService } from '../services/notification.service';
import { parse } from 'proto-parser';
import { PublishModalComponent } from '../components/publish-modal/publish-modal.component';
import { PushToBranchModalComponent } from '../components/push-to-branch-modal/push-to-branch-modal.component';
// import * as monaco from 'monaco-editor'; // Temporarily comment out

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
  imports: [CommonModule, FormsModule, NuMonacoEditorModule, PublishModalComponent, PushToBranchModalComponent],
  templateUrl: './editor.html',
  styleUrl: './editor.css',
})
export class EditorComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('downloadButton') downloadButton!: ElementRef;
  @ViewChild('downloadMenu') downloadMenu!: ElementRef;

  editorOptions = { // Removed explicit type
    theme: 'vs-dark',
    language: 'plaintext', // Reverted to plaintext
    automaticLayout: true,
    scrollBeyondLastLine: false,
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on' as const,
    wordWrap: 'on' as const,
  };
  code: string = 'syntax = "proto3";';

  // Spec details
  specTitle: string = '';
  specVersion: string = '';
  specDescription: string = '';
  specTags: string = '';

  // Current spec ID (for updates)
  currentSpecId: string | null = null;
  currentSpec: ProtobufSpec | null = null;

  // Original spec data for comparison
  originalSpecData: ProtoFile | null = null;
  originalVersion: string | null = null;

  // GitHub repository information (preserved during updates)
  githubRepoUrl: string | null = null;
  githubRepoName: string | null = null;

  // UI state
  isSaving: boolean = false;
  isLoading: boolean = false;
  isPublished: boolean = false;
  showPublishModal: boolean = false;
  showPushToBranchModal: boolean = false;

  protoFile: ProtoFile = {
    syntax: 'proto3',
    package: '',
    imports: [],
    messages: [],
    enums: [],
    services: [],
  };
  showDownloadMenu: boolean = false;
  activeTab: 'messages' | 'enums' | 'services' | 'settings';

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.showDownloadMenu) {
      const clickedInsideButton = this.downloadButton.nativeElement.contains(event.target);
      const clickedInsideMenu = this.downloadMenu && this.downloadMenu.nativeElement.contains(event.target);
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
  ) {
    this.activeTab = 'messages';
  }

  ngOnInit() {
    this.updateProtoPreview();

    // Check if we need to load a specific spec
    this.route.queryParams.subscribe((params) => {
      if (params['id']) {
        this.loadSpec(params['id'], params['version']);
      }
    });
  }

  loadSpec(specId: string, version?: string) {
    this.isLoading = true;

    this.apiService.getSpec(specId, version).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          const spec = response.data;
          this.currentSpec = spec;

          // Load spec details
          this.specTitle = spec.title;
          this.specVersion = spec.version;
          this.specDescription = spec.description || '';
          this.specTags = spec.tags?.join(', ') || '';
          this.currentSpecId = spec.id!;
          this.isPublished = !!spec.github_repo_url;

          // Load GitHub repository information
          this.githubRepoUrl = spec.github_repo_url || null;
          this.githubRepoName = spec.github_repo_name || null;
          console.log('Loaded GitHub info:', { url: this.githubRepoUrl, name: this.githubRepoName }); // <--- ADDED THIS LINE

          // Load proto data
          this.protoFile = spec.spec_data;

          // Store original data for comparison
          this.originalSpecData = JSON.parse(JSON.stringify(spec.spec_data));
          this.originalVersion = spec.version;

          // Update preview
          this.updateProtoPreview();

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

  goToDashboard() {
    this.router.navigate(['/']);
  }

  // Message methods
  addMessage() {
    this.protoFile.messages.push({
      name: 'NewMessage',
      fields: [],
      nestedMessages: [],
      nestedEnums: [],
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
      optional: false,
    });
    this.updateProtoPreview();
  }

  removeField(message: Message, index: number) {
    message.fields.splice(index, 1);
    this.updateProtoPreview();
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
        const ast = parse(content) as any;
        this.fromAst(ast);
        this.notificationService.success('Spec Uploaded', 'Successfully parsed .proto file.');
        this.updateProtoPreview();
      } catch (error: any) {
        this.notificationService.error('Parse Error', `Failed to parse .proto file: ${error.message}`);
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
        const nested = ast.root.nested[key];
        if (nested.fields) {
          this.protoFile.messages.push(this.messageFromAst(nested));
        } else if (nested.values) {
          this.protoFile.enums.push(this.enumFromAst(nested));
        } else if (nested.methods) {
          this.protoFile.services.push(this.serviceFromAst(nested));
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

  // Enum methods
  addEnum() {
    this.protoFile.enums.push({
      name: 'NewEnum',
      values: [{ name: 'UNKNOWN', number: 0 }],
    });
    this.updateProtoPreview();
  }

  removeEnum(index: number) {
    this.protoFile.enums.splice(index, 1);
    this.updateProtoPreview();
  }

  addEnumValue(enumItem: Enum) {
    const nextNumber = Math.max(...enumItem.values.map((v) => v.number), -1) + 1;
    enumItem.values.push({
      name: 'NEW_VALUE',
      number: nextNumber,
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
      methods: [],
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
      streaming: { input: false, output: false },
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
    this.validateProto();
  }

  validateProto() {
    const diagnostics: any[] = []; // Changed type to any[]

    // Basic validation: Check for duplicate message names
    const messageNames = new Set<string>();
    this.protoFile.messages.forEach((message, index) => {
      if (messageNames.has(message.name)) {
        diagnostics.push({
          severity: 8, // monaco.MarkerSeverity.Error
          message: `Duplicate message name: '${message.name}'`,
          startLineNumber: 1, // Placeholder, actual line number would require AST traversal with line info
          endLineNumber: 1,
          startColumn: 1,
          endColumn: 1,
        });
      }
      messageNames.add(message.name);

      // Check for duplicate field numbers within a message
      const fieldNumbers = new Set<number>();
      message.fields.forEach((field) => {
        if (fieldNumbers.has(field.number)) {
          diagnostics.push({
            severity: 8, // monaco.MarkerSeverity.Error
            message: `Duplicate field number '${field.number}' in message '${message.name}'`,
            startLineNumber: 1, // Placeholder
            endLineNumber: 1,
            startColumn: 1,
            endColumn: 1,
          });
        }
        fieldNumbers.add(field.number);
      });
    });

    // Basic validation: Check for duplicate enum names
    const enumNames = new Set<string>();
    this.protoFile.enums.forEach((enumItem) => {
      if (enumNames.has(enumItem.name)) {
        diagnostics.push({
          severity: 8, // monaco.MarkerSeverity.Error
          message: `Duplicate enum name: '${enumItem.name}'`,
          startLineNumber: 1, // Placeholder
          endLineNumber: 1,
          startColumn: 1,
          endColumn: 1,
        });
      }
      enumNames.add(enumItem.name);

      // Check for duplicate enum value numbers within an enum
      const enumValueNumbers = new Set<number>();
      enumItem.values.forEach((value) => {
        if (enumValueNumbers.has(value.number)) {
          diagnostics.push({
            severity: 8, // monaco.MarkerSeverity.Error
            message: `Duplicate enum value number '${value.number}' in enum '${enumItem.name}'`,
            startLineNumber: 1, // Placeholder
            endLineNumber: 1,
            startColumn: 1,
            endColumn: 1,
          });
        }
        enumValueNumbers.add(value.number);
      });
    });

    // Basic validation: Check for duplicate service names
    const serviceNames = new Set<string>();
    this.protoFile.services.forEach((service) => {
      if (serviceNames.has(service.name)) {
        diagnostics.push({
          severity: 8, // monaco.MarkerSeverity.Error
          message: `Duplicate service name: '${service.name}'`,
          startLineNumber: 1, // Placeholder
          endLineNumber: 1,
          startColumn: 1,
          endColumn: 1,
        });
      }
      serviceNames.add(service.name);

      // Check for duplicate method names within a service
      const methodNames = new Set<string>();
      service.methods.forEach((method) => {
        if (methodNames.has(method.name)) {
          diagnostics.push({
            severity: 8, // monaco.MarkerSeverity.Error
            message: `Duplicate method name '${method.name}' in service '${service.name}'`,
            startLineNumber: 1, // Placeholder
            endLineNumber: 1,
            startColumn: 1,
            endColumn: 1,
          });
        }
        methodNames.add(method.name);
      });
    });

    // Set markers in Monaco Editor (Temporarily commented out)
    // const model = monaco.editor.getModels()[0]; // Assuming only one model is open
    // if (model) {
    //   monaco.editor.setModelMarkers(model, 'owner', diagnostics);
    // }
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
      // Replace spaces and special characters with underscores, remove invalid filename characters
      return this.specTitle
        .trim()
        .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/[^\w\-_.]/g, '') // Keep only word characters, hyphens, underscores, and dots
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

  // Save functionality
  saveSpec() {
    if (!this.specTitle.trim()) {
      this.notificationService.warning(
        'Title Required',
        'Please enter a specification title before saving'
      );
      return;
    }

    this.isSaving = true;

    // Auto-increment version if spec data has changed
    let finalVersion = this.specVersion || '1.0.0';
    if (this.shouldAutoIncrementVersion()) {
      finalVersion = this.incrementVersion(finalVersion);
      this.specVersion = finalVersion; // Update the UI
    }

    const specData: any = {
      title: this.specTitle.trim(),
      version: finalVersion,
      description: this.specDescription || '',
      spec_data: this.protoFile,
      tags: this.specTags
        ? this.specTags
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag)
        : [],
      // Always include GitHub fields to preserve them during updates
      github_repo_url: this.githubRepoUrl,
      github_repo_name: this.githubRepoName,
    };

    console.log('Saving spec data:', JSON.stringify(specData, null, 2));

    // Check if version has changed - if so, create new version instead of updating
    const versionChanged =
      this.currentSpecId && this.originalVersion && this.originalVersion !== finalVersion;

    console.log('SpecData being sent to backend:', specData); // <--- ADDED THIS LINE

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

          // Update original data for future comparisons
          this.originalSpecData = JSON.parse(JSON.stringify(this.protoFile));
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

  // Version management methods
  hasSpecDataChanged(): boolean {
    if (!this.originalSpecData) {
      return false; // New spec, no comparison needed
    }

    return JSON.stringify(this.originalSpecData) !== JSON.stringify(this.protoFile);
  }

  private incrementVersion(version: string): string {
    // Parse version (supports formats like "1.0.0", "1.0", "1")
    const parts = version.split('.').map((part) => parseInt(part) || 0);

    // Ensure we have at least 3 parts (major.minor.patch)
    while (parts.length < 3) {
      parts.push(0);
    }

    // Increment patch version (last part)
    parts[parts.length - 1]++;

    return parts.join('.');
  }

  shouldAutoIncrementVersion(): boolean {
    // Only auto-increment if:
    // 1. This is an existing spec (not new)
    // 2. The spec data has changed
    // 3. The user hasn't manually changed the version
    return this.currentSpecId !== null && this.hasSpecDataChanged() && this.hasVersionNotChanged();
  }

  private hasVersionNotChanged(): boolean {
    // Check if user kept the same version as original
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

  // Publish and Commit methods
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
          this.notificationService.success('Published to GitHub!', `Successfully created repository: ${response.data.url}`);
          this.closePublishModal();
          // Reload the spec to get the updated published status and repo URL
          this.loadSpec(this.currentSpecId!);
        } else {
          this.notificationService.error('Publish Failed', response.error || 'Could not publish to GitHub.');
        }
      },
      error: (error) => {
        this.notificationService.error('Publish Error', error.error.error || 'An unknown error occurred.');
      }
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
          this.notificationService.success('Pushed to GitHub!', `Successfully pushed updates to ${this.currentSpec?.github_repo_name}.`);
          this.closePushToBranchModal();
        } else {
          this.notificationService.error('Push Failed', response.error || 'Could not push to GitHub.');
        }
      },
      error: (error) => {
        this.notificationService.error('Push Error', error.error.error || 'An unknown error occurred.');
      }
    });
  }
}
