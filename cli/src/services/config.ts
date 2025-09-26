import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

export interface ConfigData {
  apiUrl?: string;
  authToken?: string;
  defaultFormat?: 'json' | 'yaml' | 'table';
  gitIntegration?: boolean;
  autoTest?: boolean;
}

export class Config {
  private configPath: string;
  private data: ConfigData;

  constructor() {
    this.configPath = path.join(os.homedir(), '.proto-cli', 'config.json');
    this.data = this.load();
  }

  private load(): ConfigData {
    try {
      if (fs.existsSync(this.configPath)) {
        return fs.readJsonSync(this.configPath);
      }
    } catch (error) {
      // Ignore errors, use defaults
    }
    return {};
  }

  private save(): void {
    try {
      fs.ensureDirSync(path.dirname(this.configPath));
      fs.writeJsonSync(this.configPath, this.data, { spaces: 2 });
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }

  get<K extends keyof ConfigData>(key: K): ConfigData[K] {
    return this.data[key];
  }

  set<K extends keyof ConfigData>(key: K, value: ConfigData[K]): void {
    this.data[key] = value;
    this.save();
  }

  getAll(): ConfigData {
    return { ...this.data };
  }

  clear(): void {
    this.data = {};
    this.save();
  }

  isAuthenticated(): boolean {
    return !!this.data.authToken;
  }
}