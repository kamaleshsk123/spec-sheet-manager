import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { ApiService, ProtobufSpec, User, SpecVersion, Team } from '../services/api.service';
import { NotificationService } from '../services/notification.service';
import { PublishModalComponent } from '../components/publish-modal/publish-modal.component';
import { PushToBranchModalComponent } from '../components/push-to-branch-modal/push-to-branch-modal.component';
import { VersionHistoryModalComponent } from '../components/version-history-modal/version-history-modal.component';
import { forkJoin, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

interface TeamWorkspace {
  team: Team;
  specs: ProtobufSpec[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PublishModalComponent,
    PushToBranchModalComponent,
    VersionHistoryModalComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, OnDestroy {
  // Data properties
  allSpecs: ProtobufSpec[] = [];
  personalSpecs: ProtobufSpec[] = [];
  teamWorkspaces: TeamWorkspace[] = [];
  specs: ProtobufSpec[] = []; // Added missing specs property

  // UI State
  isLoading: boolean = true;
  error: string = '';
  isDropdownOpen: boolean = false;
  openSpecDropdown: string | null = null;
  dropdownPlacement: { [specId: string]: 'up' | 'down' } = {};
  canShowComparison: boolean = false; // Added missing property

  // User
  currentUser: User | null = null;

  // Modals
  showPublishModal: boolean = false;
  specToPublish: ProtobufSpec | null = null;
  showPushToBranchModal: boolean = false;
  specVersions: { [specId: string]: SpecVersion[] } = {};
  showVersionHistoryModal = false;
  specForVersionHistory: ProtobufSpec | null = null;
  showCompareModal: boolean = false;
  baseSpec: ProtobufSpec | null = null;
  leftSideSpec: ProtobufSpec | null = null;
  rightSideSpec: ProtobufSpec | null = null;

  private routerSubscription: Subscription;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private notificationService: NotificationService
  ) {
    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd && event.url === '/'))
      .subscribe(() => {
        this.loadData();
      });
  }

  ngOnInit() {
    this.loadData();
    this.loadUserProfile();
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  // --- Data Loading and Processing ---
  loadData() {
    this.isLoading = true;
    this.error = '';
    forkJoin({
      specsResponse: this.apiService.getSpecs({ limit: 200 }),
      teamsResponse: this.apiService.getTeams(),
    }).subscribe({
      next: ({ specsResponse, teamsResponse }) => {
        if (
          specsResponse.success &&
          specsResponse.data &&
          teamsResponse.success &&
          teamsResponse.data
        ) {
          const allSpecs = specsResponse.data.data;
          const teams = teamsResponse.data;
          this.allSpecs = allSpecs;
          this.specs = this.getLatestVersionsOnly(allSpecs); // Initialize specs with latest versions
          this.processWorkspaces(allSpecs, teams);
        } else {
          this.error =
            specsResponse.error || teamsResponse.error || 'Failed to load workspace data';
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.error = 'Failed to load data. Make sure the backend server is running.';
        console.error('Load data error:', err);
      },
    });
  }

  processWorkspaces(allSpecs: ProtobufSpec[], teams: Team[]) {
    const latestSpecs = this.getLatestVersionsOnly(allSpecs);
    this.personalSpecs = [];
    this.teamWorkspaces = teams.map((team) => ({ team, specs: [] }));
    latestSpecs.forEach((spec) => {
      console.log('Processing spec:', spec);
      if (spec.team_id) {
        const workspace = this.teamWorkspaces.find((w) => w.team.id === spec.team_id);
        if (workspace) {
          workspace.specs.push(spec);
        }
      } else {
        this.personalSpecs.push(spec);
      }
    });
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
      },
    });
  }

  // --- Getters for Template ---
  getComparableSpecs(): ProtobufSpec[] {
    if (!this.baseSpec) {
      return [];
    }
    // Use allSpecs to include all versions, not just latest
    const sameGroup = this.allSpecs.filter(
      (spec) =>
        spec.title === this.baseSpec!.title &&
        (spec.team_id || null) === (this.baseSpec!.team_id || null)
    );
    // Sort by version descending so newest first
    return sameGroup.sort((a, b) => this.compareVersions(b.version, a.version));
  }

  getVersionSelectionClass(spec: ProtobufSpec): string {
    // Return CSS class based on version selection state
    if (this.leftSideSpec?.id === spec.id || this.rightSideSpec?.id === spec.id) {
      return 'bg-blue-100 border-blue-500';
    }
    return 'hover:bg-gray-50';
  }

  selectVersion(spec: ProtobufSpec): void {
    // Prevent selecting the same exact record twice
    if (this.leftSideSpec?.id === spec.id || this.rightSideSpec?.id === spec.id) {
      return;
    }

    if (!this.leftSideSpec) {
      this.leftSideSpec = spec;
    } else if (!this.rightSideSpec) {
      this.rightSideSpec = spec;
    } else {
      // Replace the right side when both are already selected
      this.rightSideSpec = spec;
    }
    this.canShowComparison = !!this.leftSideSpec && !!this.rightSideSpec;
  }

  getDiffStats(): { added: number; removed: number; changed: number } | null {
    if (!this.leftSideSpec || !this.rightSideSpec) return null;
    try {
      const left = JSON.stringify(this.leftSideSpec.spec_data || {});
      const right = JSON.stringify(this.rightSideSpec.spec_data || {});
      const added = right.length > left.length ? right.length - left.length : 0;
      const removed = left.length > right.length ? left.length - right.length : 0;
      const changed = Math.abs(added - removed);
      return { added, removed, changed };
    } catch {
      return { added: 0, removed: 0, changed: 0 };
    }
  }

  getDiffData(): {
    leftLines: { content: string; lineNumber: number; type: string }[];
    rightLines: { content: string; lineNumber: number; type: string }[];
  } {
    try {
      const leftText = this.generateProtoContent(this.leftSideSpec?.spec_data || {});
      const rightText = this.generateProtoContent(this.rightSideSpec?.spec_data || {});

      const left = leftText.split('\n');
      const right = rightText.split('\n');

      const maxLen = Math.max(left.length, right.length);
      const leftLines: { content: string; lineNumber: number; type: string }[] = [];
      const rightLines: { content: string; lineNumber: number; type: string }[] = [];

      for (let i = 0; i < maxLen; i++) {
        const l = left[i] ?? '';
        const r = right[i] ?? '';
        let type: string = 'unchanged';
        if (l !== r) {
          if (l && !r) type = 'removed';
          else if (!l && r) type = 'added';
          else type = 'changed';
        }
        leftLines.push({ content: l, lineNumber: i + 1, type });
        rightLines.push({ content: r, lineNumber: i + 1, type });
      }

      return { leftLines, rightLines };
    } catch {
      return { leftLines: [], rightLines: [] };
    }
  }

  get totalSpecCount(): number {
    return (
      this.personalSpecs.length + this.teamWorkspaces.reduce((sum, ws) => sum + ws.specs.length, 0)
    );
  }

  get noWorkspacesExist(): boolean {
    return (
      this.personalSpecs.length === 0 && this.teamWorkspaces.every((w) => w.specs.length === 0)
    );
  }

  getPublishedCount(): number {
    const personalPublished = this.personalSpecs.filter((spec) => spec.is_published).length;
    const teamPublished = this.teamWorkspaces.reduce(
      (sum, ws) => sum + ws.specs.filter((spec) => spec.is_published).length,
      0
    );
    return personalPublished + teamPublished;
  }

  // getTotalDownloads(): number {
  //   const personalDownloads = this.personalSpecs.reduce(
  //     (sum, spec) => sum + (spec.download_count || 0),
  //     0
  //   );
  //   const teamDownloads = this.teamWorkspaces.reduce(
  //     (sum, ws) => sum + ws.specs.reduce((s, spec) => s + (spec.download_count || 0), 0),
  //     0
  //   );
  //   return personalDownloads + teamDownloads;
  // }

  // --- Event Handlers & UI Methods ---
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: any) {
    const clickedOnDropdownToggle = event.target.closest('[data-dropdown-toggle]');
    const clickedInsideDropdown = event.target.closest('[data-dropdown-menu]');
    if (!clickedOnDropdownToggle && !clickedInsideDropdown) {
      this.openSpecDropdown = null;
    }
    if (!event.target.closest('.relative')) {
      // Close user dropdown
      this.isDropdownOpen = false;
    }
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  getUserInitials(nameOrEmail?: string): string {
    if (!nameOrEmail) return '?';
    const source = nameOrEmail.split('@')[0];
    const parts = source.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  toggleSpecDropdown(specId: string, event?: Event) {
    const willOpen = this.openSpecDropdown !== specId;
    this.openSpecDropdown = willOpen ? specId : null;
    if (willOpen && event) {
      const target = event.currentTarget as HTMLElement | null;
      const rect = target?.getBoundingClientRect();
      const spaceBelow = rect ? window.innerHeight - rect.bottom : Number.MAX_SAFE_INTEGER;
      const estimatedMenuHeight = 240; // px
      this.dropdownPlacement[specId] = spaceBelow < estimatedMenuHeight ? 'up' : 'down';
    }
  }

  openEditor(specId?: string, version?: string) {
    this.openSpecDropdown = null;
    const queryParams: any = {};
    if (specId) queryParams.id = specId;
    if (version) queryParams.version = version;
    this.router.navigate(['/editor'], { queryParams });
  }

  logout() {
    this.apiService.clearAuthToken();
    this.router.navigate(['/auth']);
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString();
  }

  // --- Modal Handlers ---
  openPublishModal(spec: ProtobufSpec) {
    this.specToPublish = spec;
    this.showPublishModal = true;
    this.openSpecDropdown = null;
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
          this.notificationService.success(
            'Published to GitHub!',
            `Successfully created repository: ${response.data.url}`
          );
          this.closePublishModal();
          this.loadData();
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

  openPushToBranchModal(spec: ProtobufSpec) {
    this.specToPublish = spec;
    this.showPushToBranchModal = true;
    this.openSpecDropdown = null;
  }

  closePushToBranchModal() {
    this.showPushToBranchModal = false;
    this.specToPublish = null;
  }

  handlePushToBranch(event: any) {
    if (!this.specToPublish) return;
    this.apiService.pushToBranch(this.specToPublish.id!, event.commitMessage).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success(
            'Pushed to GitHub!',
            `Successfully pushed updates to ${this.specToPublish?.github_repo_name}.`
          );
          this.closePushToBranchModal();
          this.loadData();
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

  openVersionHistoryModal(spec: ProtobufSpec) {
    this.openSpecDropdown = null;
    this.specForVersionHistory = spec;
    this.showVersionHistoryModal = true;
    if (!this.specVersions[spec.id!]) {
      this.apiService.getSpecVersions(spec.id!).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.specVersions[spec.id!] = response.data;
          }
        },
        error: (error) => {
          this.notificationService.error('Error', 'Could not load spec versions.');
        },
      });
    }
  }

  closeVersionHistoryModal() {
    this.showVersionHistoryModal = false;
    this.specForVersionHistory = null;
  }

  handleEditVersion(event: { specId: string; version: string }) {
    this.closeVersionHistoryModal();
    this.openEditor(event.specId, event.version);
  }

  openCompareModal(spec: ProtobufSpec) {
    this.openSpecDropdown = null;
    this.baseSpec = spec;
    this.leftSideSpec = null;
    this.rightSideSpec = null;
    this.canShowComparison = false;
    this.showCompareModal = true;
  }

  closeCompareModal() {
    this.showCompareModal = false;
    this.baseSpec = null;
    this.leftSideSpec = null;
    this.rightSideSpec = null;
    this.canShowComparison = false;
  }

  // --- Versioning & Comparison Helpers ---
  getLatestVersionsOnly(allSpecs: ProtobufSpec[]): ProtobufSpec[] {
    const specGroups = new Map<string, ProtobufSpec[]>();
    allSpecs.forEach((spec) => {
      const key = `${spec.title}_${spec.team_id || 'personal'}`;
      if (!specGroups.has(key)) {
        specGroups.set(key, []);
      }
      specGroups.get(key)!.push(spec);
    });
    const latestSpecs: ProtobufSpec[] = [];
    specGroups.forEach((specs, title) => {
      const sortedSpecs = specs.sort((a, b) => this.compareVersions(b.version, a.version));
      latestSpecs.push(sortedSpecs[0]);
    });
    return latestSpecs;
  }

  compareVersions(v1: string, v2: string): number {
    const v1Parts = v1.split('.').map((part) => parseInt(part) || 0);
    const v2Parts = v2.split('.').map((part) => parseInt(part) || 0);
    const maxLength = Math.max(v1Parts.length, v2Parts.length);
    while (v1Parts.length < maxLength) v1Parts.push(0);
    while (v2Parts.length < maxLength) v2Parts.push(0);
    for (let i = 0; i < maxLength; i++) {
      if (v1Parts[i] > v2Parts[i]) return 1;
      if (v1Parts[i] < v2Parts[i]) return -1;
    }
    return 0;
  }

  getVersionCount(title: string): number {
    return this.allSpecs.filter((spec) => spec.title === title).length;
  }

  // --- Delete Methods ---
  async deleteSpec(spec: ProtobufSpec) {
    this.openSpecDropdown = null;
    const confirmed = await this.notificationService.confirm(
      'Delete Specification',
      `Are you sure you want to delete "${spec.title}"? This action cannot be undone.`,
      { confirmText: 'Delete', cancelText: 'Cancel', type: 'danger' }
    );
    if (confirmed) {
      this.apiService.deleteSpec(spec.id!).subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success(
              'Specification Deleted',
              `"${spec.title}" has been deleted successfully`
            );
            this.loadData();
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
        },
      });
    }
  }

  async deleteSpecAndAllVersions(spec: ProtobufSpec) {
    this.openSpecDropdown = null;
    const confirmed = await this.notificationService.confirm(
      'Delete Entire Specification',
      `Are you sure you want to delete the entire spec "${spec.title}" and all its versions? This action is permanent and cannot be undone.`,
      { confirmText: 'Delete All Versions', cancelText: 'Cancel', type: 'danger' }
    );
    if (confirmed) {
      this.apiService.deleteSpecAndAllVersions(spec.title).subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success(
              'Specification Deleted',
              `The entire spec "${spec.title}" has been deleted successfully`
            );
            this.loadData();
          } else {
            this.notificationService.error(
              'Delete Failed',
              response.error || 'Failed to delete the entire specification'
            );
          }
        },
        error: (error) => {
          console.error('Delete all versions error:', error);
          this.notificationService.error(
            'Delete Error',
            'Failed to delete the entire specification. Please try again.'
          );
        },
      });
    }
  }

  // Reset and Diff helpers for Compare modal
  resetComparison(): void {
    this.leftSideSpec = null;
    this.rightSideSpec = null;
    this.canShowComparison = false;
  }

  private generateProtoContent(specData: any): string {
    if (!specData) return '// No content available';

    let content = `syntax = "${specData.syntax || 'proto3'}";\n\n`;

    if (specData.package) {
      content += `package ${specData.package};\n\n`;
    }

    if (Array.isArray(specData.imports) && specData.imports.length > 0) {
      for (const imp of specData.imports) {
        content += `import "${imp}";\n`;
      }
      content += '\n';
    }

    const normalizeType = (t: any): string => {
      if (!t) return 'string';
      if (typeof t === 'string') return t;
      if (typeof t === 'object' && t.value) return t.value;
      return String(t);
    };

    const renderMessage = (message: any, indent: number): string => {
      const pad = '  '.repeat(indent);
      let s = `${pad}message ${message.name} {\n`;

      if (Array.isArray(message.nestedEnums)) {
        for (const en of message.nestedEnums) {
          s += `${pad}  enum ${en.name} {\n`;
          for (const v of en.values || []) {
            s += `${pad}    ${v.name} = ${v.number};\n`;
          }
          s += `${pad}  }\n\n`;
        }
      }

      if (Array.isArray(message.nestedMessages)) {
        for (const nm of message.nestedMessages) {
          s += renderMessage(nm, indent + 1);
        }
      }

      for (const field of message.fields || []) {
        const repeated = field.repeated ? 'repeated ' : '';
        const optional = field.optional ? 'optional ' : '';
        const type = normalizeType(field.type);
        s += `${pad}  ${repeated}${optional}${type} ${field.name} = ${field.number};\n`;
      }

      s += `${pad}}\n\n`;
      return s;
    };

    for (const e of specData.enums || []) {
      content += `enum ${e.name} {\n`;
      for (const v of e.values || []) {
        content += `  ${v.name} = ${v.number};\n`;
      }
      content += `}\n\n`;
    }

    for (const m of specData.messages || []) {
      content += renderMessage(m, 0);
    }

    for (const svc of specData.services || []) {
      content += `service ${svc.name} {\n`;
      for (const method of svc.methods || []) {
        const inStream = method.streaming?.input ? 'stream ' : '';
        const outStream = method.streaming?.output ? 'stream ' : '';
        content += `  rpc ${method.name}(${inStream}${method.inputType}) returns (${outStream}${method.outputType});\n`;
      }
      content += `}\n\n`;
    }

    return content;
  }
}
