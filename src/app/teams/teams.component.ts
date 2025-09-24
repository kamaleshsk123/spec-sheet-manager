import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ApiService, Team } from '../services/api.service';
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

  constructor(
    private apiService: ApiService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTeams();
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
}
