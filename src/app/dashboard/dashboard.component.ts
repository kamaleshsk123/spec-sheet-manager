import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, ProtobufSpec, User } from '../services/api.service';
import { NotificationService } from '../services/notification.service';
import { PublishModalComponent } from '../components/publish-modal/publish-modal.component';

interface DiffLine {
  content: string;
  type: 'added' | 'removed' | 'modified' | 'unchanged' | 'empty';
  lineNumber: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, PublishModalComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  specs: ProtobufSpec[] = []; // Only latest versions for display
  allSpecs: ProtobufSpec[] = []; // All versions for comparison
  isLoading: boolean = true;
  error: string = '';
  isDropdownOpen: boolean = false;
  currentUser: User | null = null;
  openSpecDropdown: string | null = null;
  showPublishModal: boolean = false;
  specToPublish: ProtobufSpec | null = null;
  
  // Comparison modal properties
  showCompareModal: boolean = false;
  baseSpec: ProtobufSpec | null = null; // The spec family we're comparing within
  leftSideSpec: ProtobufSpec | null = null; // User selected left side
  rightSideSpec: ProtobufSpec | null = null; // User selected right side

  constructor(
    private apiService: ApiService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadSpecs();
    this.loadUserProfile();
  }

  loadUserProfile() {
    this.apiService.getProfile().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.currentUser = response.data;
        }
      },
      error: (error) => {
        console.error('Failed to load user profile', error);
      }
    });
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  toggleSpecDropdown(specId: string) {
    this.openSpecDropdown = this.openSpecDropdown === specId ? null : specId;
  }

  openPublishModal(spec: ProtobufSpec) {
    this.specToPublish = spec;
    this.showPublishModal = true;
    this.openSpecDropdown = null; // Close the dropdown
  }

  closePublishModal() {
    this.showPublishModal = false;
    this.specToPublish = null;
  }

  handlePublish(event: any) {
    if (!this.specToPublish) return;

    this.apiService.publishToGithub(this.specToPublish.id!, event).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Published to GitHub!', `Successfully created repository: ${response.data.url}`);
          this.closePublishModal();
        } else {
          this.notificationService.error('Publish Failed', response.error || 'Could not publish to GitHub.');
        }
      },
      error: (error) => {
        this.notificationService.error('Publish Error', error.error.error || 'An unknown error occurred.');
      }
    });
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
    this.baseSpec = spec; // This determines which spec family to show versions for
    this.leftSideSpec = null;
    this.rightSideSpec = null;
    this.showCompareModal = true;
  }

  closeCompareModal() {
    this.showCompareModal = false;
    this.baseSpec = null;
    this.leftSideSpec = null;
    this.rightSideSpec = null;
  }

  selectLeftSideSpec(spec: ProtobufSpec) {
    this.leftSideSpec = spec;
  }

  selectRightSideSpec(spec: ProtobufSpec) {
    this.rightSideSpec = spec;
  }

  canShowComparison(): boolean {
    return this.leftSideSpec !== null && this.rightSideSpec !== null;
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
    
    // Return ALL versions of the same title (including the base spec itself)
    return this.allSpecs.filter(spec => 
      spec.title === this.baseSpec?.title
    );
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

  // Enhanced diff calculation for line-by-line comparison
  calculateDiff(leftContent: string, rightContent: string): { leftLines: DiffLine[], rightLines: DiffLine[] } {
    const leftLines = leftContent.split('\n');
    const rightLines = rightContent.split('\n');
    
    const result = {
      leftLines: [] as DiffLine[],
      rightLines: [] as DiffLine[]
    };

    // Create a simple LCS-based diff algorithm
    const lcs = this.longestCommonSubsequence(leftLines, rightLines);
    
    let leftIndex = 0;
    let rightIndex = 0;
    let leftLineNum = 1;
    let rightLineNum = 1;

    for (const commonLine of lcs) {
      // Add removed lines (in left but not in common)
      while (leftIndex < leftLines.length && leftLines[leftIndex] !== commonLine) {
        result.leftLines.push({ 
          content: leftLines[leftIndex], 
          type: 'removed', 
          lineNumber: leftLineNum 
        });
        result.rightLines.push({ 
          content: '', 
          type: 'empty', 
          lineNumber: rightLineNum 
        });
        leftIndex++;
        leftLineNum++;
      }

      // Add added lines (in right but not in common)
      while (rightIndex < rightLines.length && rightLines[rightIndex] !== commonLine) {
        result.leftLines.push({ 
          content: '', 
          type: 'empty', 
          lineNumber: leftLineNum 
        });
        result.rightLines.push({ 
          content: rightLines[rightIndex], 
          type: 'added', 
          lineNumber: rightLineNum 
        });
        rightIndex++;
        rightLineNum++;
      }

      // Add the common line
      if (leftIndex < leftLines.length && rightIndex < rightLines.length) {
        result.leftLines.push({ 
          content: leftLines[leftIndex], 
          type: 'unchanged', 
          lineNumber: leftLineNum 
        });
        result.rightLines.push({ 
          content: rightLines[rightIndex], 
          type: 'unchanged', 
          lineNumber: rightLineNum 
        });
        leftIndex++;
        rightIndex++;
        leftLineNum++;
        rightLineNum++;
      }
    }

    // Add remaining removed lines
    while (leftIndex < leftLines.length) {
      result.leftLines.push({ 
        content: leftLines[leftIndex], 
        type: 'removed', 
        lineNumber: leftLineNum 
      });
      result.rightLines.push({ 
        content: '', 
        type: 'empty', 
        lineNumber: rightLineNum 
      });
      leftIndex++;
      leftLineNum++;
    }

    // Add remaining added lines
    while (rightIndex < rightLines.length) {
      result.leftLines.push({ 
        content: '', 
        type: 'empty', 
        lineNumber: leftLineNum 
      });
      result.rightLines.push({ 
        content: rightLines[rightIndex], 
        type: 'added', 
        lineNumber: rightLineNum 
      });
      rightIndex++;
      rightLineNum++;
    }

    return result;
  }

  // Longest Common Subsequence algorithm for better diff
  private longestCommonSubsequence(left: string[], right: string[]): string[] {
    const m = left.length;
    const n = right.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    // Build LCS table
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (left[i - 1] === right[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Reconstruct LCS
    const lcs: string[] = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (left[i - 1] === right[j - 1]) {
        lcs.unshift(left[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return lcs;
  }

  // Get diff data for comparison
  getDiffData(): { leftLines: DiffLine[], rightLines: DiffLine[] } | null {
    if (!this.leftSideSpec || !this.rightSideSpec) return null;
    
    const leftContent = this.generateProtoContent(this.leftSideSpec);
    const rightContent = this.generateProtoContent(this.rightSideSpec);
    
    return this.calculateDiff(leftContent, rightContent);
  }

  // Get CSS class for diff line (VS Code style)
  getDiffLineClass(type: string): string {
    switch (type) {
      case 'added': return 'bg-green-50 border-l-2 border-green-400';
      case 'removed': return 'bg-red-50 border-l-2 border-red-400';
      case 'modified': return 'bg-yellow-50 border-l-2 border-yellow-400';
      case 'empty': return 'bg-gray-25';
      default: return 'hover:bg-gray-25';
    }
  }

  // Get text color for diff line (VS Code style)
  getDiffTextClass(type: string): string {
    switch (type) {
      case 'added': return 'text-green-900';
      case 'removed': return 'text-red-900';
      case 'modified': return 'text-yellow-900';
      case 'empty': return 'text-gray-300';
      default: return 'text-gray-800';
    }
  }

  // Smart version selection logic
  selectVersion(spec: ProtobufSpec) {
    if (!this.leftSideSpec) {
      this.selectLeftSideSpec(spec);
    } else if (!this.rightSideSpec && spec.id !== this.leftSideSpec.id) {
      this.selectRightSideSpec(spec);
    } else if (spec.id === this.leftSideSpec.id) {
      // Deselect left side
      this.leftSideSpec = null;
    } else if (spec.id === this.rightSideSpec?.id) {
      // Deselect right side
      this.rightSideSpec = null;
    }
  }

  // Get CSS classes for version selection
  getVersionSelectionClass(spec: ProtobufSpec): string {
    if (this.leftSideSpec?.id === spec.id) {
      return 'border-blue-500 bg-blue-50';
    } else if (this.rightSideSpec?.id === spec.id) {
      return 'border-green-500 bg-green-50';
    } else {
      return 'border-gray-200 hover:border-gray-300 hover:bg-gray-50';
    }
  }

  // Get diff statistics
  getDiffStats(): { added: number, removed: number, modified: number } | null {
    const diffData = this.getDiffData();
    if (!diffData) return null;

    const stats = {
      added: 0,
      removed: 0,
      modified: 0
    };

    diffData.leftLines.forEach(line => {
      if (line.type === 'added') stats.added++;
      else if (line.type === 'removed') stats.removed++;
      else if (line.type === 'modified') stats.modified++;
    });

    diffData.rightLines.forEach(line => {
      if (line.type === 'added') stats.added++;
      else if (line.type === 'removed') stats.removed++;
      else if (line.type === 'modified') stats.modified++;
    });

    // Avoid double counting - modified lines appear on both sides
    stats.added = diffData.rightLines.filter(line => line.type === 'added').length;
    stats.removed = diffData.leftLines.filter(line => line.type === 'removed').length;
    stats.modified = diffData.leftLines.filter(line => line.type === 'modified').length;

    return stats;
  }
}
