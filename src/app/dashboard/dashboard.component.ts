import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, ProtobufSpec } from '../services/api.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  specs: ProtobufSpec[] = []; // Only latest versions for display
  allSpecs: ProtobufSpec[] = []; // All versions for comparison
  isLoading: boolean = true;
  error: string = '';
  
  // Comparison modal properties
  showCompareModal: boolean = false;
  baseSpec: ProtobufSpec | null = null;
  selectedCompareSpec: ProtobufSpec | null = null;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadSpecs();
  }

  loadSpecs() {
    this.isLoading = true;
    this.error = '';

    this.apiService.getSpecs({ page: 1, limit: 50 }).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          // Store all specs for comparison
          this.allSpecs = response.data.data;
          // Group specs by title and show only the latest version of each
          this.specs = this.getLatestVersionsOnly(response.data.data);
        } else {
          this.error = response.error || 'Failed to load specifications';
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Load specs error:', error);
        this.error = 'Failed to load specifications. Make sure the backend server is running.';
      }
    });
  }

  openEditor(specId?: string) {
    if (specId) {
      // Navigate to editor with spec ID (we'll implement this)
      this.router.navigate(['/editor'], { queryParams: { id: specId } });
    } else {
      // Navigate to new editor
      this.router.navigate(['/editor']);
    }
  }

  async deleteSpec(spec: ProtobufSpec) {
    const confirmed = await this.notificationService.confirm(
      'Delete Specification',
      `Are you sure you want to delete "${spec.title}"? This action cannot be undone.`,
      {
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger'
      }
    );

    if (confirmed) {
      this.apiService.deleteSpec(spec.id!).subscribe({
        next: (response) => {
          if (response.success) {
            this.specs = this.specs.filter(s => s.id !== spec.id);
            this.notificationService.success(
              'Specification Deleted',
              `"${spec.title}" has been deleted successfully`
            );
          } else {
            this.notificationService.error(
              'Delete Failed',
              response.error || 'Failed to delete specification'
            );
          }
        },
        error: (error) => {
          console.error('Delete error:', error);
          this.notificationService.error(
            'Delete Error',
            'Failed to delete specification. Please try again.'
          );
        }
      });
    }
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString();
  }

  getPublishedCount(): number {
    return this.specs.filter(spec => spec.is_published).length;
  }

  getTotalDownloads(): number {
    return this.specs.reduce((sum, spec) => sum + (spec.download_count || 0), 0);
  }

  logout() {
    this.apiService.clearAuthToken();
    this.router.navigate(['/auth']);
  }

  // Comparison methods
  openCompareModal(spec: ProtobufSpec) {
    this.baseSpec = spec;
    this.selectedCompareSpec = null;
    this.showCompareModal = true;
  }

  closeCompareModal() {
    this.showCompareModal = false;
    this.baseSpec = null;
    this.selectedCompareSpec = null;
  }

  // Group specs by title and return only the latest version of each
  getLatestVersionsOnly(allSpecs: ProtobufSpec[]): ProtobufSpec[] {
    const specGroups = new Map<string, ProtobufSpec[]>();
    
    // Group specs by title
    allSpecs.forEach(spec => {
      if (!specGroups.has(spec.title)) {
        specGroups.set(spec.title, []);
      }
      specGroups.get(spec.title)!.push(spec);
    });
    
    // Get the latest version from each group
    const latestSpecs: ProtobufSpec[] = [];
    specGroups.forEach((specs, title) => {
      // Sort by version (newest first) and take the first one
      const sortedSpecs = specs.sort((a, b) => {
        return this.compareVersions(b.version, a.version); // b > a for descending
      });
      latestSpecs.push(sortedSpecs[0]);
    });
    
    return latestSpecs;
  }

  // Compare version numbers (returns positive if v1 > v2, negative if v1 < v2, 0 if equal)
  compareVersions(v1: string, v2: string): number {
    const v1Parts = v1.split('.').map(part => parseInt(part) || 0);
    const v2Parts = v2.split('.').map(part => parseInt(part) || 0);
    
    const maxLength = Math.max(v1Parts.length, v2Parts.length);
    while (v1Parts.length < maxLength) v1Parts.push(0);
    while (v2Parts.length < maxLength) v2Parts.push(0);
    
    for (let i = 0; i < maxLength; i++) {
      if (v1Parts[i] > v2Parts[i]) return 1;
      if (v1Parts[i] < v2Parts[i]) return -1;
    }
    
    return 0;
  }

  getComparableSpecs(): ProtobufSpec[] {
    if (!this.baseSpec) return [];
    
    // Use allSpecs (not just displayed specs) to find all versions of the same title
    return this.allSpecs.filter(spec => 
      spec.id !== this.baseSpec?.id && 
      spec.title === this.baseSpec?.title
    );
  }

  selectSpecForComparison(spec: ProtobufSpec) {
    this.selectedCompareSpec = spec;
  }

  // Generate protobuf text from spec data
  generateProtoContent(spec: ProtobufSpec): string {
    if (!spec.spec_data) {
      return 'No content available';
    }

    const data = spec.spec_data;
    let protoContent = `syntax = "${data.syntax || 'proto3'}";\n\n`;
    
    // Add package
    if (data.package) {
      protoContent += `package ${data.package};\n\n`;
    }
    
    // Add imports
    if (data.imports && data.imports.length > 0) {
      for (const importPath of data.imports) {
        protoContent += `import "${importPath}";\n`;
      }
      protoContent += '\n';
    }
    
    // Add enums
    if (data.enums && data.enums.length > 0) {
      for (const enumItem of data.enums) {
        protoContent += `enum ${enumItem.name} {\n`;
        if (enumItem.values) {
          for (const value of enumItem.values) {
            protoContent += `  ${value.name} = ${value.number};\n`;
          }
        }
        protoContent += '}\n\n';
      }
    }
    
    // Add messages
    if (data.messages && data.messages.length > 0) {
      for (const message of data.messages) {
        protoContent += this.generateMessageContent(message, 0);
      }
    }
    
    // Add services
    if (data.services && data.services.length > 0) {
      for (const service of data.services) {
        protoContent += `service ${service.name} {\n`;
        if (service.methods) {
          for (const method of service.methods) {
            const inputStream = method.streaming?.input ? 'stream ' : '';
            const outputStream = method.streaming?.output ? 'stream ' : '';
            protoContent += `  rpc ${method.name}(${inputStream}${method.inputType}) returns (${outputStream}${method.outputType});\n`;
          }
        }
        protoContent += '}\n\n';
      }
    }
    
    return protoContent;
  }

  private generateMessageContent(message: any, indent: number): string {
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
    if (message.fields) {
      for (const field of message.fields) {
        const repeated = field.repeated ? 'repeated ' : '';
        const optional = field.optional ? 'optional ' : '';
        content += `${spaces}  ${repeated}${optional}${field.type} ${field.name} = ${field.number};\n`;
      }
    }
    
    content += `${spaces}}\n\n`;
    return content;
  }

  // Get the number of versions for a given spec title
  getVersionCount(title: string): number {
    return this.allSpecs.filter(spec => spec.title === title).length;
  }

  // Helper method to compare version numbers
  isNewerVersion(version1: string, version2: string): boolean {
    return this.compareVersions(version1, version2) > 0;
  }
}