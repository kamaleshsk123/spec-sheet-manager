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
    // Return specs that can be compared
    return this.specs.filter((spec) => spec.id !== this.baseSpec?.id);
  }

  getVersionSelectionClass(spec: ProtobufSpec): string {
    // Return CSS class based on version selection state
    if (this.leftSideSpec?.id === spec.id || this.rightSideSpec?.id === spec.id) {
      return 'bg-blue-100 border-blue-500';
    }
    return 'hover:bg-gray-50';
  }

  selectVersion(spec: ProtobufSpec): void {
    // Select a version for comparison
    if (!this.leftSideSpec) {
      this.leftSideSpec = spec;
    } else if (!this.rightSideSpec) {
      this.rightSideSpec = spec;
    } else {
      // If both sides are already selected, replace the right side
      this.rightSideSpec = spec;
    }
    this.canShowComparison = !!this.leftSideSpec && !!this.rightSideSpec;
  }

  getDiffStats(): { added: number; removed: number; changed: number } | null {
    // Return dummy diff stats - implement actual diff logic as needed
    if (!this.leftSideSpec || !this.rightSideSpec) return null;
    return {
      added: 0,
      removed: 0,
      changed: 0,
    };
  }

  getDiffData(): { leftLines: any[]; rightLines: any[] } {
    // Return dummy diff data - implement actual diff logic as needed
    return { leftLines: [], rightLines: [] };
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

  getTotalDownloads(): number {
    const personalDownloads = this.personalSpecs.reduce(
      (sum, spec) => sum + (spec.download_count || 0),
      0
    );
    const teamDownloads = this.teamWorkspaces.reduce(
      (sum, ws) => sum + ws.specs.reduce((s, spec) => s + (spec.download_count || 0), 0),
      0
    );
    return personalDownloads + teamDownloads;
  }

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

  toggleSpecDropdown(specId: string) {
    this.openSpecDropdown = this.openSpecDropdown === specId ? null : specId;
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
    this.showCompareModal = true;
  }

  closeCompareModal() {
    this.showCompareModal = false;
    this.baseSpec = null;
    this.leftSideSpec = null;
    this.rightSideSpec = null;
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
}
