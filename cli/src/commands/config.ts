import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { table } from 'table';
import { Config } from '../services/config';

export class ConfigCommand {
  private config: Config;

  constructor() {
    this.config = new Config();
  }

  getCommand(): Command {
    const cmd = new Command('config');
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

  private async getConfig(key?: string): Promise<void> {
    if (key) {
      const value = this.config.get(key as any);
      if (value !== undefined) {
        console.log(chalk.green(`${key}: ${JSON.stringify(value)}`));
      } else {
        console.log(chalk.red(`Configuration key '${key}' not found`));
      }
    } else {
      await this.listConfig();
    }
  }

  private async setConfig(key: string, value: string): Promise<void> {
    try {
      // Try to parse as JSON first
      let parsedValue: any;
      try {
        parsedValue = JSON.parse(value);
      } catch {
        // If not JSON, treat as string
        parsedValue = value;
      }

      // Convert string booleans
      if (value === 'true') parsedValue = true;
      if (value === 'false') parsedValue = false;

      this.config.set(key as any, parsedValue);
      console.log(chalk.green(`✓ Set ${key} = ${JSON.stringify(parsedValue)}`));
    } catch (error: any) {
      console.log(chalk.red(`Failed to set configuration: ${error.message}`));
    }
  }

  private async listConfig(): Promise<void> {
    const config = this.config.getAll();
    const entries = Object.entries(config);

    if (entries.length === 0) {
      console.log(chalk.yellow('No configuration values set'));
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

    console.log(table(data, {
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

  private async resetConfig(options: { yes?: boolean }): Promise<void> {
    if (!options.yes) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to reset all configuration?',
          default: false
        }
      ]);

      if (!confirm) {
        console.log(chalk.yellow('Cancelled.'));
        return;
      }
    }

    this.config.clear();
    console.log(chalk.green('✓ Configuration reset to defaults'));
  }

  private async setupConfig(): Promise<void> {
    console.log(chalk.bold('🔧 Protobuf Manager CLI Setup\n'));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'apiUrl',
        message: 'API URL:',
        default: 'http://localhost:3000/api',
        validate: (input) => {
          try {
            new URL(input);
            return true;
          } catch {
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
      this.config.set(key as any, value);
    });

    console.log(chalk.green('\n✓ Configuration saved successfully!'));
    console.log(chalk.gray('You can modify these settings anytime with:'));
    console.log(chalk.gray('  proto-cli config set <key> <value>'));
    console.log(chalk.gray('  proto-cli config list'));

    // Prompt for authentication
    const { shouldLogin } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldLogin',
        message: 'Would you like to login now?',
        default: true
      }
    ]);

    if (shouldLogin) {
      console.log(chalk.gray('\nRun: proto-cli auth login'));
    }
  }
}