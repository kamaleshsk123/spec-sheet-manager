import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs-extra';
import * as path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';
import { ApiService, ProtobufSpec } from '../services/api';
import { Config } from '../services/config';

export class GitCommand {
  private api: ApiService;
  private config: Config;
  private git: SimpleGit;

  constructor() {
    this.api = new ApiService();
    this.config = new Config();
    this.git = simpleGit();
  }

  getCommand(): Command {
    const cmd = new Command('git');
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

  private async initGitIntegration(options: { directory: string }): Promise<void> {
    const spinner = ora('Initializing git integration...').start();

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
      
      spinner.succeed(chalk.green(`Git integration initialized in: ${protoDir}`));
      console.log(chalk.gray('Configuration saved to .proto-cli.yml'));
      console.log(chalk.gray('Run "proto-cli git sync" to sync your specifications'));
      
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to initialize git integration: ' + error.message));
    }
  }

  private async syncWithGit(options: { message: string; push?: boolean }): Promise<void> {
    if (!this.config.isAuthenticated()) {
      console.log(chalk.red('Please login first: proto-cli auth login'));
      return;
    }

    const spinner = ora('Syncing specifications with git...').start();

    try {
      // Fetch all specifications
      const response = await this.api.getSpecs({ page: 1, limit: 1000 });
      
      if (!response.success || !response.data) {
        spinner.fail(chalk.red('Failed to fetch specifications: ' + response.error));
        return;
      }

      const specs = response.data.data;
      const protoDir = path.resolve('./proto-specs');
      
      if (!await fs.pathExists(protoDir)) {
        spinner.fail(chalk.red('Git integration not initialized. Run "proto-cli git init" first.'));
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
          } catch (error) {
            console.log(chalk.yellow('\nWarning: Failed to push to remote. You may need to set up a remote repository.'));
          }
        }
      }

      spinner.succeed(chalk.green(`Synced ${specs.length} specifications to git`));
      console.log(chalk.gray(`Location: ${protoDir}`));
      
    } catch (error: any) {
      spinner.fail(chalk.red('Sync failed: ' + error.message));
    }
  }

  private async pullFromGit(): Promise<void> {
    const spinner = ora('Pulling from git...').start();

    try {
      const protoDir = path.resolve('./proto-specs');
      
      if (!await fs.pathExists(protoDir)) {
        spinner.fail(chalk.red('Git integration not initialized. Run "proto-cli git init" first.'));
        return;
      }

      await this.git.cwd(protoDir);
      await this.git.pull();
      
      spinner.succeed(chalk.green('Successfully pulled from git'));
      console.log(chalk.gray('Use "proto-cli git sync" to update the manager with any changes'));
      
    } catch (error: any) {
      spinner.fail(chalk.red('Pull failed: ' + error.message));
    }
  }

  private async showGitStatus(): Promise<void> {
    try {
      const protoDir = path.resolve('./proto-specs');
      
      if (!await fs.pathExists(protoDir)) {
        console.log(chalk.red('Git integration not initialized. Run "proto-cli git init" first.'));
        return;
      }

      await this.git.cwd(protoDir);
      const status = await this.git.status();
      
      console.log(chalk.bold('Git Status:'));
      console.log(chalk.gray(`Branch: ${status.current}`));
      console.log(chalk.gray(`Ahead: ${status.ahead}, Behind: ${status.behind}`));
      
      if (status.files.length === 0) {
        console.log(chalk.green('Working directory clean'));
      } else {
        console.log(chalk.yellow(`\nChanges (${status.files.length} files):`));
        status.files.forEach(file => {
          const statusChar = file.working_dir === 'M' ? 'M' : 
                           file.working_dir === 'A' ? 'A' : 
                           file.working_dir === 'D' ? 'D' : '?';
          console.log(`  ${statusChar} ${file.path}`);
        });
      }
      
    } catch (error: any) {
      console.log(chalk.red('Failed to get git status: ' + error.message));
    }
  }

  private async setupGitHooks(options: { preCommit?: boolean; postCommit?: boolean }): Promise<void> {
    const spinner = ora('Setting up git hooks...').start();

    try {
      const protoDir = path.resolve('./proto-specs');
      const hooksDir = path.join(protoDir, '.git', 'hooks');
      
      if (!await fs.pathExists(hooksDir)) {
        spinner.fail(chalk.red('Git repository not found. Run "proto-cli git init" first.'));
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

      spinner.succeed(chalk.green('Git hooks installed successfully'));
      
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to setup git hooks: ' + error.message));
    }
  }

  private generateProtoContent(spec: ProtobufSpec): string {
    // Reuse the proto generation logic
    if (!spec.spec_data) return 'No content available';

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

  private generateIndexFile(specs: ProtobufSpec[]): string {
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