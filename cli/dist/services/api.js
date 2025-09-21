"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiService = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("./config");
class ApiService {
    constructor() {
        this.config = new config_1.Config();
        this.client = axios_1.default.create({
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
    async login(email, password) {
        try {
            const response = await this.client.post('/auth/login', { email, password });
            return response.data;
        }
        catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }
    async getSpecs(params) {
        try {
            const response = await this.client.get('/specs', { params });
            return response.data;
        }
        catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }
    async getSpec(id) {
        try {
            const response = await this.client.get(`/specs/${id}`);
            return response.data;
        }
        catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }
    async createSpec(spec) {
        try {
            const response = await this.client.post('/specs', spec);
            return response.data;
        }
        catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }
    async updateSpec(id, spec) {
        try {
            const response = await this.client.put(`/specs/${id}`, spec);
            return response.data;
        }
        catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }
    async deleteSpec(id) {
        try {
            const response = await this.client.delete(`/specs/${id}`);
            return response.data;
        }
        catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }
    async publishSpec(id) {
        try {
            const response = await this.client.post(`/specs/${id}/publish`);
            return response.data;
        }
        catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }
}
exports.ApiService = ApiService;
//# sourceMappingURL=api.js.map