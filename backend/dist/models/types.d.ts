export interface User {
    id: string;
    email: string;
    name: string;
    password_hash?: string;
    created_at: Date;
    updated_at: Date;
    github_id?: string;
    github_username?: string;
    github_access_token?: string;
}
export interface CreateUserRequest {
    email: string;
    name: string;
    password: string;
}
export interface LoginRequest {
    email: string;
    password: string;
}
export interface Field {
    type: string;
    name: string;
    number: number;
    repeated?: boolean;
    optional?: boolean;
}
export interface EnumValue {
    name: string;
    number: number;
}
export interface Enum {
    name: string;
    values: EnumValue[];
}
export interface ServiceMethod {
    name: string;
    inputType: string;
    outputType: string;
    streaming?: {
        input: boolean;
        output: boolean;
    };
}
export interface Service {
    name: string;
    methods: ServiceMethod[];
}
export interface Message {
    name: string;
    fields: Field[];
    nestedMessages?: Message[];
    nestedEnums?: Enum[];
}
export interface ProtoFileData {
    syntax: string;
    package?: string;
    imports: string[];
    messages: Message[];
    enums: Enum[];
    services: Service[];
}
export interface ProtobufSpec {
    id: string;
    title: string;
    version: string;
    description?: string;
    spec_data: ProtoFileData;
    created_at: Date;
    updated_at: Date;
    created_by: string;
    is_published: boolean;
    tags: string[];
    download_count: number;
    github_repo_url?: string | null;
    github_repo_name?: string | null;
    team_id?: string | null;
}
export interface CreateSpecRequest {
    title: string;
    version?: string;
    description?: string;
    spec_data: ProtoFileData;
    tags?: string[];
    github_repo_url?: string | null;
    github_repo_name?: string | null;
    team_id?: string | null;
}
export interface UpdateSpecRequest {
    title?: string;
    version?: string;
    description?: string;
    spec_data?: ProtoFileData;
    tags?: string[];
    is_published?: boolean;
    github_repo_url?: string | null;
    github_repo_name?: string | null;
    team_id?: string | null;
}
export interface SpecVersion {
    id: string;
    spec_id: string;
    version_number: string;
    spec_data: ProtoFileData;
    created_at: Date;
    created_by: string;
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
export interface SpecQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    tags?: string[];
    created_by?: string;
    is_published?: boolean;
    sort_by?: 'created_at' | 'updated_at' | 'title' | 'download_count';
    sort_order?: 'asc' | 'desc';
}
//# sourceMappingURL=types.d.ts.map