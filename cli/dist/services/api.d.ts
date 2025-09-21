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
export declare class ApiService {
    private client;
    private config;
    constructor();
    login(email: string, password: string): Promise<ApiResponse<{
        token: string;
    }>>;
    getSpecs(params?: {
        page?: number;
        limit?: number;
    }): Promise<ApiResponse<{
        data: ProtobufSpec[];
        total: number;
    }>>;
    getSpec(id: string): Promise<ApiResponse<ProtobufSpec>>;
    createSpec(spec: Omit<ProtobufSpec, 'id'>): Promise<ApiResponse<ProtobufSpec>>;
    updateSpec(id: string, spec: Partial<ProtobufSpec>): Promise<ApiResponse<ProtobufSpec>>;
    deleteSpec(id: string): Promise<ApiResponse<void>>;
    publishSpec(id: string): Promise<ApiResponse<ProtobufSpec>>;
}
//# sourceMappingURL=api.d.ts.map