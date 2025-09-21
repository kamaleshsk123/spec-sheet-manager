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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const simple_git_1 = __importDefault(require("simple-git"));
const api_1 = require("../services/api");
const config_1 = require("../services/config");
class GitCommand {
    constructor() {
        this.api = new api_1.ApiService();
        this.config = new config_1.Config();
        this.git = (0, simple_git_1.default)();
    }
    getCommand() {
        const cmd = new commander_1.Command('git');
        cmd.description('Git integration commands');
        cmd
            .command('init')
            .description('Initialize git integration for protobuf specs')
            .option('-d, --directory <dir>', 'Directory to initialize', './proto-specs')
            .action(async (options) => {
            await this.initGitIntegration(options);
        });
        cmd
            .command('sync')
            .description('Sync specifications with git repository')
            .option('-m, --message <message>', 'Commit message', 'Update protobuf specifications')
            .option('--push', 'Push changes to remote')
            .action(async (options) => {
            await this.syncWithGit(options);
        });
        cmd
            .command('pull')
            .description('Pull specifications from git and update manager')
            .action(async () => {
            await this.pullFromGit();
        });
        cmd
            .command('status')
            .description('Show git status for protobuf specifications')
            .action(async () => {
            await this.showGitStatus();
        });
        cmd
            .command('hook')
            .description('Setup git hooks for automatic sync')
            .option('--pre-commit', 'Setup pre-commit hook')
            .option('--post-commit', 'Setup post-commit hook')
            .action(async (options) => {
            await this.setupGitHooks(options);
        });
        return cmd;
    }
    async initGitIntegration(options) {
        const spinner = (0, ora_1.default)('Initializing git integration...').start();
        try {
            const protoDir = path.resolve(options.directory);
            // Create directory if it doesn't exist
            await fs.ensureDir(protoDir);
            // Initialize git repo if not exists
            const isRepo = await fs.pathExists(path.join(protoDir, '.git'));
            if (!isRepo) {
                await this.git.cwd(protoDir).init();
                spinner.text = 'Git repository initialized...';
            }
            // Create .proto-cli.yml config file
            const configContent = `
# Protobuf Manager Git Integration Config
version: 1.0.0
sync:
  enabled: true
  auto_commit: true
  auto_push: false
  commit_message_template: "Update {spec_title} to version {version}"
  
directories:
  specs: "./specs"
  generated: "./generated"
  
ignore:
  - "*.tmp"
  - "node_modules/"
  - ".DS_Store"

hooks:
  pre_commit:
    - validate_schemas
    - run_tests
  post_commit:
    - sync_to_manager
`;
            await fs.writeFile(path.join(protoDir, '.proto-cli.yml'), configContent.trim());
            // Create directory structure
            await fs.ensureDir(path.join(protoDir, 'specs'));
            await fs.ensureDir(path.join(protoDir, 'generated'));
            // Create .gitignore
            const gitignoreContent = `
# Protobuf Manager
.proto-cli/
*.tmp
*.log

# Generated files
generated/

# OS files
.DS_Store
Thumbs.db
`;
            await fs.writeFile(path.join(protoDir, '.gitignore'), gitignoreContent.trim());
            // Update CLI config
            this.config.set('gitIntegration', true);
            spinner.succeed(chalk_1.default.green(`Git integration initialized in: ${protoDir}`));
            console.log(chalk_1.default.gray('Configuration saved to .proto-cli.yml'));
            console.log(chalk_1.default.gray('Run "proto-cli git sync" to sync your specifications'));
        }
        catch (error) {
            spinner.fail(chalk_1.default.red('Failed to initialize git integration: ' + error.message));
        }
    }
    async syncWithGit(options) {
        if (!this.config.isAuthenticated()) {
            console.log(chalk_1.default.red('Please login first: proto-cli auth login'));
            return;
        }
        const spinner = (0, ora_1.default)('Syncing specifications with git...').start();
        try {
            // Fetch all specifications
            const response = await this.api.getSpecs({ page: 1, limit: 1000 });
            if (!response.success || !response.data) {
                spinner.fail(chalk_1.default.red('Failed to fetch specifications: ' + response.error));
                return;
            }
            const specs = response.data.data;
            const protoDir = path.resolve('./proto-specs');
            if (!await fs.pathExists(protoDir)) {
                spinner.fail(chalk_1.default.red('Git integration not initialized. Run "proto-cli git init" first.'));
                return;
            }
            const specsDir = path.join(protoDir, 'specs');
            await fs.ensureDir(specsDir);
            // Write each spec to a .proto file
            for (const spec of specs) {
                const filename = `${spec.title.replace(/[^a-zA-Z0-9]/g, '_')}_v${spec.version}.proto`;
                const filepath = path.join(specsDir, filename);
                const content = this.generateProtoContent(spec);
                await fs.writeFile(filepath, content);
                spinner.text = `Synced: ${spec.title} v${spec.version}`;
            }
            // Create index file
            const indexContent = this.generateIndexFile(specs);
            await fs.writeFile(path.join(protoDir, 'INDEX.md'), indexContent);
            // Git operations
            await this.git.cwd(protoDir);
            await this.git.add('.');
            const status = await this.git.status();
            if (status.files.length > 0) {
                await this.git.commit(options.message);
                spinner.text = 'Changes committed to git...';
                if (options.push) {
                    try {
                        await this.git.push();
                        spinner.text = 'Changes pushed to remote...';
                    }
                    catch (error) {
                        console.log(chalk_1.default.yellow('\nWarning: Failed to push to remote. You may need to set up a remote repository.'));
                    }
                }
            }
            spinner.succeed(chalk_1.default.green(`Synced ${specs.length} specifications to git`));
            console.log(chalk_1.default.gray(`Location: ${protoDir}`));
        }
        catch (error) {
            spinner.fail(chalk_1.default.red('Sync failed: ' + error.message));
        }
    }
    async pullFromGit() {
        const spinner = (0, ora_1.default)('Pulling from git...').start();
        try {
            const protoDir = path.resolve('./proto-specs');
            if (!await fs.pathExists(protoDir)) {
                spinner.fail(chalk_1.default.red('Git integration not initialized. Run "proto-cli git init" first.'));
                return;
            }
            await this.git.cwd(protoDir);
            await this.git.pull();
            spinner.succeed(chalk_1.default.green('Successfully pulled from git'));
            console.log(chalk_1.default.gray('Use "proto-cli git sync" to update the manager with any changes'));
        }
        catch (error) {
            spinner.fail(chalk_1.default.red('Pull failed: ' + error.message));
        }
    }
    async showGitStatus() {
        try {
            const protoDir = path.resolve('./proto-specs');
            if (!await fs.pathExists(protoDir)) {
                console.log(chalk_1.default.red('Git integration not initialized. Run "proto-cli git init" first.'));
                return;
            }
            await this.git.cwd(protoDir);
            const status = await this.git.status();
            console.log(chalk_1.default.bold('Git Status:'));
            console.log(chalk_1.default.gray(`Branch: ${status.current}`));
            console.log(chalk_1.default.gray(`Ahead: ${status.ahead}, Behind: ${status.behind}`));
            if (status.files.length === 0) {
                console.log(chalk_1.default.green('Working directory clean'));
            }
            else {
                console.log(chalk_1.default.yellow(`\nChanges (${status.files.length} files):`));
                status.files.forEach(file => {
                    const statusChar = file.working_dir === 'M' ? 'M' :
                        file.working_dir === 'A' ? 'A' :
                            file.working_dir === 'D' ? 'D' : '?';
                    console.log(`  ${statusChar} ${file.path}`);
                });
            }
        }
        catch (error) {
            console.log(chalk_1.default.red('Failed to get git status: ' + error.message));
        }
    }
    async setupGitHooks(options) {
        const spinner = (0, ora_1.default)('Setting up git hooks...').start();
        try {
            const protoDir = path.resolve('./proto-specs');
            const hooksDir = path.join(protoDir, '.git', 'hooks');
            if (!await fs.pathExists(hooksDir)) {
                spinner.fail(chalk_1.default.red('Git repository not found. Run "proto-cli git init" first.'));
                return;
            }
            if (options.preCommit) {
                const preCommitHook = `#!/bin/sh
# Protobuf Manager pre-commit hook
echo "Running protobuf validation..."
proto-cli test validate --staged
if [ $? -ne 0 ]; then
  echo "Protobuf validation failed. Commit aborted."
  exit 1
fi
`;
                await fs.writeFile(path.join(hooksDir, 'pre-commit'), preCommitHook);
                await fs.chmod(path.join(hooksDir, 'pre-commit'), '755');
                spinner.text = 'Pre-commit hook installed...';
            }
            if (options.postCommit) {
                const postCommitHook = `#!/bin/sh
# Protobuf Manager post-commit hook
echo "Syncing with Protobuf Manager..."
proto-cli git sync --push
`;
                await fs.writeFile(path.join(hooksDir, 'post-commit'), postCommitHook);
                await fs.chmod(path.join(hooksDir, 'post-commit'), '755');
                spinner.text = 'Post-commit hook installed...';
            }
            spinner.succeed(chalk_1.default.green('Git hooks installed successfully'));
        }
        catch (error) {
            spinner.fail(chalk_1.default.red('Failed to setup git hooks: ' + error.message));
        }
    }
    generateProtoContent(spec) {
        // Reuse the proto generation logic
        if (!spec.spec_data)
            return 'No content available';
        const data = spec.spec_data;
        let protoContent = `syntax = "${data.syntax || 'proto3'}";\n\n`;
        if (data.package) {
            protoContent += `package ${data.package};\n\n`;
        }
        // Add header comment
        protoContent = `// Generated by Protobuf Manager
// Specification: ${spec.title}
// Version: ${spec.version}
// Created: ${spec.created_at}
${spec.description ? `// Description: ${spec.description}` : ''}

${protoContent}`;
        return protoContent;
    }
    generateIndexFile(specs) {
        let content = `# Protobuf Specifications Index

Generated on: ${new Date().toISOString()}
Total specifications: ${specs.length}

## Specifications

| Title | Version | Published | Created | File |
|-------|---------|-----------|---------|------|
`;
        specs.forEach(spec => {
            const filename = `${spec.title.replace(/[^a-zA-Z0-9]/g, '_')}_v${spec.version}.proto`;
            const published = spec.is_published ? '✅' : '❌';
            const created = spec.created_at ? new Date(spec.created_at).toLocaleDateString() : 'N/A';
            content += `| ${spec.title} | ${spec.version} | ${published} | ${created} | [${filename}](./specs/${filename}) |\n`;
        });
        content += `\n## Usage

\`\`\`bash
# Sync with manager
proto-cli git sync

# Pull latest changes
proto-cli git pull

# Check status
proto-cli git status
\`\`\`
`;
        return content;
    }
}
exports.GitCommand = GitCommand;
//# sourceMappingURL=git.js.map