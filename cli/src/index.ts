#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { AuthCommand } from './commands/auth';
import { SpecCommand } from './commands/spec';
import { CompareCommand } from './commands/compare';
import { GitCommand } from './commands/git';
import { TestCommand } from './commands/test';
import { ConfigCommand } from './commands/config';

const program = new Command();

program
  .name('proto-cli')
  .description('CLI tool for Protobuf Specification Manager')
  .version('1.0.0');

// Add commands
program.addCommand(new AuthCommand().getCommand());
program.addCommand(new SpecCommand().getCommand());
program.addCommand(new CompareCommand().getCommand());
program.addCommand(new GitCommand().getCommand());
program.addCommand(new TestCommand().getCommand());
program.addCommand(new ConfigCommand().getCommand());

// Global error handler
program.exitOverride();

try {
  program.parse();
} catch (error: any) {
  if (error.code === 'commander.help' || error.code === 'commander.helpDisplayed') {
    process.exit(0);
  }
  console.error(chalk.red('Error:'), error.message);
  process.exit(1);
}