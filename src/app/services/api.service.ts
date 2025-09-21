import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

// Types matching backend
export interface ProtoFileData {
  syntax: string;
  package?: string;
  imports: string[];
  messages: any[];
  enums: any[];
  services: any[];
}

export interface ProtobufSpec {
  id?: string;
  title: string;
  version: string;
  description?: string;
  spec_data: ProtoFileData;
  created_at?: Date;
  updated_at?: Date;
  created_by?: string;
  is_published?: boolean;
  tags?: string[];
  download_count?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: Date;
  github_id?: string;
  github_username?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = 'http://localhost:3000/api';
  private authToken = new BehaviorSubject<string | null>(null);

  constructor(private http: HttpClient) {
    // Load token from localStorage on service init
    const token = localStorage.getItem('auth_token');
    if (token) {
      this.authToken.next(token);
    }
  }

  private getHeaders(): HttpHeaders {
    const token = this.authToken.value;
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  // Auth methods
  setAuthToken(token: string): void {
    localStorage.setItem('auth_token', token);
    this.authToken.next(token);
  }

  clearAuthToken(): void {
    localStorage.removeItem('auth_token');
    this.authToken.next(null);
  }

  isAuthenticated(): boolean {
    return this.authToken.value !== null;
  }

  getProfile(): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(
      `${this.baseUrl}/auth/profile`,
      { headers: this.getHeaders() }
    );
  }

  // Spec CRUD operations
  createSpec(spec: Omit<ProtobufSpec, 'id'>): Observable<ApiResponse<ProtobufSpec>> {
    return this.http.post<ApiResponse<ProtobufSpec>>(
      `${this.baseUrl}/specs`,
      spec,
      { headers: this.getHeaders() }
    );
  }

  getSpecs(params?: {
    page?: number;
    limit?: number;
    search?: string;
    tags?: string[];
  }): Observable<ApiResponse<PaginatedResponse<ProtobufSpec>>> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.tags) {
        params.tags.forEach(tag => {
          httpParams = httpParams.append('tags', tag);
        });
      }
    }

    return this.http.get<ApiResponse<PaginatedResponse<ProtobufSpec>>>(
      `${this.baseUrl}/specs`,
      { 
        headers: this.getHeaders(),
        params: httpParams
      }
    );
  }

  getSpec(id: string): Observable<ApiResponse<ProtobufSpec>> {
    return this.http.get<ApiResponse<ProtobufSpec>>(
      `${this.baseUrl}/specs/${id}`,
      { headers: this.getHeaders() }
    );
  }

  updateSpec(id: string, spec: Partial<ProtobufSpec>): Observable<ApiResponse<ProtobufSpec>> {
    return this.http.put<ApiResponse<ProtobufSpec>>(
      `${this.baseUrl}/specs/${id}`,
      spec,
      { headers: this.getHeaders() }
    );
  }

  deleteSpec(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(
      `${this.baseUrl}/specs/${id}`,
      { headers: this.getHeaders() }
    );
  }

  incrementDownloadCount(id: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.baseUrl}/specs/${id}/download`,
      {},
      { headers: this.getHeaders() }
    );
  }

  // Auth endpoints
  login(email: string, password: string): Observable<ApiResponse<{user: any, token: string}>> {
    return this.http.post<ApiResponse<{user: any, token: string}>>(
      `${this.baseUrl}/auth/login`,
      { email, password }
    );
  }

  register(email: string, name: string, password: string): Observable<ApiResponse<{user: any, token: string}>> {
    return this.http.post<ApiResponse<{user: any, token: string}>>(
      `${this.baseUrl}/auth/register`,
      { email, name, password }
    );
  }

  // Health check
  healthCheck(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`http://localhost:3000/health`);
  }
}