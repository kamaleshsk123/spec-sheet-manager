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
  specs: ProtobufSpec[] = [];
  isLoading: boolean = true;
  error: string = '';

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
          this.specs = response.data.data;
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
}