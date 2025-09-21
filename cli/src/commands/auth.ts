import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { ApiService } from '../services/api';
import { Config } from '../services/config';

export class AuthCommand {
  private api: ApiService;
  private config: Config;

  constructor() {
    this.api = new ApiService();
    this.config = new Config();
  }

  getCommand(): Command {
    const cmd = new Command('auth');
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

  private async login(options: { email?: string; password?: string }): Promise<void> {
    let { email, password } = options;

    // Prompt for missing credentials
    if (!email || !password) {
      const answers = await inquirer.prompt([
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

    const spinner = ora('Logging in...').start();

    try {
      const response = await this.api.login(email!, password!);
      
      if (response.success && response.data?.token) {
        this.config.set('authToken', response.data.token);
        spinner.succeed(chalk.green('Successfully logged in!'));
        console.log(chalk.gray(`Token saved to: ${require('os').homedir()}/.proto-cli/config.json`));
      } else {
        spinner.fail(chalk.red('Login failed: ' + (response.error || 'Unknown error')));
        process.exit(1);
      }
    } catch (error: any) {
      spinner.fail(chalk.red('Login failed: ' + error.message));
      process.exit(1);
    }
  }

  private async logout(): Promise<void> {
    if (!this.config.isAuthenticated()) {
      console.log(chalk.yellow('You are not logged in.'));
      return;
    }

    this.config.set('authToken', undefined);
    console.log(chalk.green('Successfully logged out!'));
  }

  private async status(): Promise<void> {
    if (this.config.isAuthenticated()) {
      console.log(chalk.green('✓ Authenticated'));
      console.log(chalk.gray(`API URL: ${this.config.get('apiUrl') || 'http://localhost:3000/api'}`));
    } else {
      console.log(chalk.red('✗ Not authenticated'));
      console.log(chalk.gray('Run "proto-cli auth login" to authenticate'));
    }
  }
}