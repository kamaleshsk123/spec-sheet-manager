export interface ConfigData {
    apiUrl?: string;
    authToken?: string;
    defaultFormat?: 'json' | 'yaml' | 'table';
    gitIntegration?: boolean;
    autoTest?: boolean;
}
export declare class Config {
    private configPath;
    private data;
    constructor();
    private load;
    private save;
    get<K extends keyof ConfigData>(key: K): ConfigData[K];
    set<K extends keyof ConfigData>(key: K, value: ConfigData[K]): void;
    getAll(): ConfigData;
    clear(): void;
    isAuthenticated(): boolean;
}
//# sourceMappingURL=config.d.ts.map