"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const table_1 = require("table");
const config_1 = require("../services/config");
class ConfigCommand {
    constructor() {
        this.config = new config_1.Config();
    }
    getCommand() {
        const cmd = new commander_1.Command('config');
        cmd.description('Configuration management commands');
        cmd
            .command('get [key]')
            .description('Get configuration value(s)')
            .action(async (key) => {
            await this.getConfig(key);
        });
        cmd
            .command('set <key> <value>')
            .description('Set configuration value')
            .action(async (key, value) => {
            await this.setConfig(key, value);
        });
        cmd
            .command('list')
            .alias('ls')
            .description('List all configuration values')
            .action(async () => {
            await this.listConfig();
        });
        cmd
            .command('reset')
            .description('Reset configuration to defaults')
            .option('-y, --yes', 'Skip confirmation')
            .action(async (options) => {
            await this.resetConfig(options);
        });
        cmd
            .command('setup')
            .description('Interactive configuration setup')
            .action(async () => {
            await this.setupConfig();
        });
        return cmd;
    }
    async getConfig(key) {
        if (key) {
            const value = this.config.get(key);
            if (value !== undefined) {
                console.log(chalk_1.default.green(`${key}: ${JSON.stringify(value)}`));
            }
            else {
                console.log(chalk_1.default.red(`Configuration key '${key}' not found`));
            }
        }
        else {
            await this.listConfig();
        }
    }
    async setConfig(key, value) {
        try {
            // Try to parse as JSON first
            let parsedValue;
            try {
                parsedValue = JSON.parse(value);
            }
            catch {
                // If not JSON, treat as string
                parsedValue = value;
            }
            // Convert string booleans
            if (value === 'true')
                parsedValue = true;
            if (value === 'false')
                parsedValue = false;
            this.config.set(key, parsedValue);
            console.log(chalk_1.default.green(`✓ Set ${key} = ${JSON.stringify(parsedValue)}`));
        }
        catch (error) {
            console.log(chalk_1.default.red(`Failed to set configuration: ${error.message}`));
        }
    }
    async listConfig() {
        const config = this.config.getAll();
        const entries = Object.entries(config);
        if (entries.length === 0) {
            console.log(chalk_1.default.yellow('No configuration values set'));
            return;
        }
        const data = [
            ['Key', 'Value', 'Type']
        ];
        entries.forEach(([key, value]) => {
            const displayValue = value === undefined ? 'undefined' :
                typeof value === 'string' ? `"${value}"` :
                    JSON.stringify(value);
            data.push([key, displayValue, typeof value]);
        });
        console.log((0, table_1.table)(data, {
            border: {
                topBody: '─',
                topJoin: '┬',
                topLeft: '┌',
                topRight: '┐',
                bottomBody: '─',
                bottomJoin: '┴',
                bottomLeft: '└',
                bottomRight: '┘',
                bodyLeft: '│',
                bodyRight: '│',
                bodyJoin: '│',
                joinBody: '─',
                joinLeft: '├',
                joinRight: '┤',
                joinJoin: '┼'
            }
        }));
    }
    async resetConfig(options) {
        if (!options.yes) {
            const { confirm } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Are you sure you want to reset all configuration?',
                    default: false
                }
            ]);
            if (!confirm) {
                console.log(chalk_1.default.yellow('Cancelled.'));
                return;
            }
        }
        this.config.clear();
        console.log(chalk_1.default.green('✓ Configuration reset to defaults'));
    }
    async setupConfig() {
        console.log(chalk_1.default.bold('🔧 Protobuf Manager CLI Setup\n'));
        const answers = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'apiUrl',
                message: 'API URL:',
                default: 'http://localhost:3000/api',
                validate: (input) => {
                    try {
                        new URL(input);
                        return true;
                    }
                    catch {
                        return 'Please enter a valid URL';
                    }
                }
            },
            {
                type: 'list',
                name: 'defaultFormat',
                message: 'Default output format:',
                choices: ['table', 'json', 'yaml'],
                default: 'table'
            },
            {
                type: 'confirm',
                name: 'gitIntegration',
                message: 'Enable Git integration?',
                default: false
            },
            {
                type: 'confirm',
                name: 'autoTest',
                message: 'Enable automatic testing?',
                default: true
            }
        ]);
        // Set configuration values
        Object.entries(answers).forEach(([key, value]) => {
            this.config.set(key, value);
        });
        console.log(chalk_1.default.green('\n✓ Configuration saved successfully!'));
        console.log(chalk_1.default.gray('You can modify these settings anytime with:'));
        console.log(chalk_1.default.gray('  proto-cli config set <key> <value>'));
        console.log(chalk_1.default.gray('  proto-cli config list'));
        // Prompt for authentication
        const { shouldLogin } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'shouldLogin',
                message: 'Would you like to login now?',
                default: true
            }
        ]);
        if (shouldLogin) {
            console.log(chalk_1.default.gray('\nRun: proto-cli auth login'));
        }
    }
}
exports.ConfigCommand = ConfigCommand;
//# sourceMappingURL=config.js.map