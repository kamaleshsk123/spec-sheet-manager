import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent {
  isLogin = true;
  isLoading = false;
  error = '';

  // Form data
  email = '';
  password = '';
  name = '';

  constructor(
    private apiService: ApiService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  toggleMode() {
    this.isLogin = !this.isLogin;
    this.error = '';
    this.clearForm();
  }

  clearForm() {
    this.email = '';
    this.password = '';
    this.name = '';
  }

  onSubmit() {
    if (!this.email || !this.password || (!this.isLogin && !this.name)) {
      this.error = 'Please fill in all required fields';
      return;
    }

    this.isLoading = true;
    this.error = '';

    if (this.isLogin) {
      this.login();
    } else {
      this.register();
    }
  }

  login() {
    this.apiService.login(this.email, this.password).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          this.apiService.setAuthToken(response.data.token);
          this.notificationService.success(
            'Welcome Back!',
            `Successfully logged in as ${response.data.user.name}`
          );
          this.router.navigate(['/dashboard']);
        } else {
          this.error = response.error || 'Login failed';
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Login error:', error);
        this.error = error.error?.error || 'Login failed. Please try again.';
      }
    });
  }

  register() {
    this.apiService.register(this.email, this.name, this.password).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          this.apiService.setAuthToken(response.data.token);
          this.notificationService.success(
            'Account Created!',
            `Welcome ${response.data.user.name}! Your account has been created successfully.`
          );
          this.router.navigate(['/dashboard']);
        } else {
          this.error = response.error || 'Registration failed';
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Registration error:', error);
        this.error = error.error?.error || 'Registration failed. Please try again.';
      }
    });
  }
}