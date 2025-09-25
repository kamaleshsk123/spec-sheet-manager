import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ApiService, Team, User } from '../services/api.service';
import { NotificationService } from '../services/notification.service';

interface TeamWithMembers extends Team {
  members: any[];
  inviteEmail?: string; // For the input field
}

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './teams.component.html',
  styleUrl: './teams.component.css',
})
export class TeamsComponent implements OnInit {
  teams: TeamWithMembers[] = [];
  isLoading = true;
  newTeamName = '';
  currentUser: User | null = null;

  constructor(
    private apiService: ApiService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTeams();
    this.loadProfile();
  }

  loadProfile(): void {
    this.apiService.getProfile().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.currentUser = response.data;
        }
      },
      error: (err) => {
        this.notificationService.error('Failed to load user profile.', err.message);
      }
    });
  }

  loadTeams(): void {
    this.isLoading = true;
    this.apiService.getTeams().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.teams = response.data.map((team) => ({ ...team, members: [] }));
          this.teams.forEach((team) => this.loadMembersFor(team));
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.notificationService.error('Failed to load teams.', err.message);
      },
    });
  }

  loadMembersFor(team: TeamWithMembers): void {
    this.apiService.getTeamMembers(team.id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          team.members = response.data;
        }
      },
      error: (err) => {
        this.notificationService.error(`Failed to load members for ${team.name}.`, err.message);
      },
    });
  }

  createTeam(): void {
    if (!this.newTeamName.trim()) {
      this.notificationService.warning('Team name cannot be empty.');
      return;
    }

    this.apiService.createTeam(this.newTeamName).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success(`Team '${this.newTeamName}' created successfully.`);
          this.newTeamName = '';
          this.loadTeams(); // Refresh the list
        }
      },
      error: (err) => {
        this.notificationService.error('Failed to create team.', err.error?.error || err.message);
      },
    });
  }

  goToDashboard() {
    this.router.navigate(['/']);
  }
  inviteMember(team: TeamWithMembers): void {
    const email = team.inviteEmail;
    if (!email || !email.trim()) {
      this.notificationService.warning('Email cannot be empty.');
      return;
    }

    this.apiService.inviteMember(team.id, email).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success(`Invitation sent to ${email}.`);
          team.inviteEmail = '';
          this.loadMembersFor(team); // Refresh members list
        }
      },
      error: (err) => {
        this.notificationService.error(
          'Failed to send invitation.',
          err.error?.error || err.message
        );
      },
    });
  }

  isTeamOwner(team: TeamWithMembers): boolean {
    return this.currentUser?.id === team.owner_id;
  }

  removeMember(team: TeamWithMembers, memberId: string): void {
    this.notificationService.confirm(
      'Remove Member',
      'Are you sure you want to remove this member from the team?',
      { confirmText: 'Remove', cancelText: 'Cancel', type: 'danger' }
    ).then(confirmed => {
      if (confirmed) {
        this.apiService.removeTeamMember(team.id, memberId).subscribe({
          next: (response) => {
            if (response.success) {
              this.notificationService.success('Member removed successfully.');
              this.loadMembersFor(team); // Refresh members list
            }
          },
          error: (err) => {
            this.notificationService.error(
              'Failed to remove member.',
              err.error?.error || err.message
            );
          },
        });
      }
    });
  }

  deleteTeam(team: TeamWithMembers): void {
    this.notificationService.confirm(
      'Delete Team',
      `Are you sure you want to delete the team "${team.name}"? This action cannot be undone.`,
      { confirmText: 'Delete', cancelText: 'Cancel', type: 'danger' }
    ).then(confirmed => {
      if (confirmed) {
        this.apiService.deleteTeam(team.id).subscribe({
          next: (response) => {
            if (response.success) {
              this.notificationService.success('Team deleted successfully.');
              this.loadTeams(); // Refresh teams list
            }
          },
          error: (err) => {
            this.notificationService.error(
              'Failed to delete team.',
              err.error?.error || err.message
            );
          },
        });
      }
    });
  }
}
