"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthCommand = void 0;
const commander_1 = require("commander");
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const api_1 = require("../services/api");
const config_1 = require("../services/config");
class AuthCommand {
    constructor() {
        this.api = new api_1.ApiService();
        this.config = new config_1.Config();
    }
    getCommand() {
        const cmd = new commander_1.Command('auth');
        cmd.description('Authentication commands');
        cmd
            .command('login')
            .description('Login to the Protobuf Manager')
            .option('-e, --email <email>', 'Email address')
            .option('-p, --password <password>', 'Password')
            .action(async (options) => {
            await this.login(options);
        });
        cmd
            .command('logout')
            .description('Logout from the Protobuf Manager')
            .action(async () => {
            await this.logout();
        });
        cmd
            .command('status')
            .description('Check authentication status')
            .action(async () => {
            await this.status();
        });
        return cmd;
    }
    async login(options) {
        let { email, password } = options;
        // Prompt for missing credentials
        if (!email || !password) {
            const answers = await inquirer_1.default.prompt([
                {
                    type: 'input',
                    name: 'email',
                    message: 'Email:',
                    when: !email,
                    validate: (input) => input.includes('@') || 'Please enter a valid email'
                },
                {
                    type: 'password',
                    name: 'password',
                    message: 'Password:',
                    when: !password,
                    validate: (input) => input.length > 0 || 'Password is required'
                }
            ]);
            email = email || answers.email;
            password = password || answers.password;
        }
        const spinner = (0, ora_1.default)('Logging in...').start();
        try {
            const response = await this.api.login(email, password);
            if (response.success && response.data?.token) {
                this.config.set('authToken', response.data.token);
                spinner.succeed(chalk_1.default.green('Successfully logged in!'));
                console.log(chalk_1.default.gray(`Token saved to: ${require('os').homedir()}/.proto-cli/config.json`));
            }
            else {
                spinner.fail(chalk_1.default.red('Login failed: ' + (response.error || 'Unknown error')));
                process.exit(1);
            }
        }
        catch (error) {
            spinner.fail(chalk_1.default.red('Login failed: ' + error.message));
            process.exit(1);
        }
    }
    async logout() {
        if (!this.config.isAuthenticated()) {
            console.log(chalk_1.default.yellow('You are not logged in.'));
            return;
        }
        this.config.set('authToken', undefined);
        console.log(chalk_1.default.green('Successfully logged out!'));
    }
    async status() {
        if (this.config.isAuthenticated()) {
            console.log(chalk_1.default.green('✓ Authenticated'));
            console.log(chalk_1.default.gray(`API URL: ${this.config.get('apiUrl') || 'http://localhost:3000/api'}`));
        }
        else {
            console.log(chalk_1.default.red('✗ Not authenticated'));
            console.log(chalk_1.default.gray('Run "proto-cli auth login" to authenticate'));
        }
    }
}
exports.AuthCommand = AuthCommand;
//# sourceMappingURL=auth.js.map