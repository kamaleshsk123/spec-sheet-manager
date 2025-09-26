"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
class Config {
    constructor() {
        this.configPath = path.join(os.homedir(), '.proto-cli', 'config.json');
        this.data = this.load();
    }
    load() {
        try {
            if (fs.existsSync(this.configPath)) {
                return fs.readJsonSync(this.configPath);
            }
        }
        catch (error) {
            // Ignore errors, use defaults
        }
        return {};
    }
    save() {
        try {
            fs.ensureDirSync(path.dirname(this.configPath));
            fs.writeJsonSync(this.configPath, this.data, { spaces: 2 });
        }
        catch (error) {
            console.error('Failed to save config:', error);
        }
    }
    get(key) {
        return this.data[key];
    }
    set(key, value) {
        this.data[key] = value;
        this.save();
    }
    getAll() {
        return { ...this.data };
    }
    clear() {
        this.data = {};
        this.save();
    }
    isAuthenticated() {
        return !!this.data.authToken;
    }
}
exports.Config = Config;
//# sourceMappingURL=config.js.map