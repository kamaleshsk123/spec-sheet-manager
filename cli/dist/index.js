#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const auth_1 = require("./commands/auth");
const spec_1 = require("./commands/spec");
const compare_1 = require("./commands/compare");
const git_1 = require("./commands/git");
const test_1 = require("./commands/test");
const config_1 = require("./commands/config");
const program = new commander_1.Command();
program
    .name('proto-cli')
    .description('CLI tool for Protobuf Specification Manager')
    .version('1.0.0');
// Add commands
program.addCommand(new auth_1.AuthCommand().getCommand());
program.addCommand(new spec_1.SpecCommand().getCommand());
program.addCommand(new compare_1.CompareCommand().getCommand());
program.addCommand(new git_1.GitCommand().getCommand());
program.addCommand(new test_1.TestCommand().getCommand());
program.addCommand(new config_1.ConfigCommand().getCommand());
// Global error handler
program.exitOverride();
try {
    program.parse();
}
catch (error) {
    if (error.code === 'commander.help' || error.code === 'commander.helpDisplayed') {
        process.exit(0);
    }
    console.error(chalk_1.default.red('Error:'), error.message);
    process.exit(1);
}
//# sourceMappingURL=index.js.map