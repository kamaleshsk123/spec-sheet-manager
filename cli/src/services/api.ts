import axios, { AxiosInstance } from 'axios';
import { Config } from './config';

export interface ProtobufSpec {
  id?: string;
  title: string;
  version: string;
  description?: string;
  spec_data: any;
  is_published?: boolean;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  download_count?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ApiService {
  private client: AxiosInstance;
  private config: Config;

  constructor() {
    this.config = new Config();
    this.client = axios.create({
      baseURL: this.config.get('apiUrl') || 'http://localhost:3000/api',
      timeout: 30000,
    });

    // Add auth interceptor
    this.client.interceptors.request.use((config) => {
      const token = this.config.get('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async login(email: string, password: string): Promise<ApiResponse<{ token: string }>> {
    try {
      const response = await this.client.post('/auth/login', { email, password });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  async getSpecs(params?: { page?: number; limit?: number }): Promise<ApiResponse<{ data: ProtobufSpec[]; total: number }>> {
    try {
      const response = await this.client.get('/specs', { params });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  async getSpec(id: string): Promise<ApiResponse<ProtobufSpec>> {
    try {
      const response = await this.client.get(`/specs/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  async createSpec(spec: Omit<ProtobufSpec, 'id'>): Promise<ApiResponse<ProtobufSpec>> {
    try {
      const response = await this.client.post('/specs', spec);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  async updateSpec(id: string, spec: Partial<ProtobufSpec>): Promise<ApiResponse<ProtobufSpec>> {
    try {
      const response = await this.client.put(`/specs/${id}`, spec);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  async deleteSpec(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.client.delete(`/specs/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  async publishSpec(id: string): Promise<ApiResponse<ProtobufSpec>> {
    try {
      const response = await this.client.post(`/specs/${id}/publish`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }
}