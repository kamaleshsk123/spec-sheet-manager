import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { ApiService, ProtobufSpec } from '../services/api';
import { Config } from '../services/config';

interface TestResult {
  passed: boolean;
  message: string;
  details?: any;
}

interface ValidationRule {
  name: string;
  description: string;
  validate: (spec: ProtobufSpec) => TestResult;
}

export class TestCommand {
  private api: ApiService;
  private config: Config;
  private validationRules: ValidationRule[];

  constructor() {
    this.api = new ApiService();
    this.config = new Config();
    this.validationRules = this.initializeValidationRules();
  }

  getCommand(): Command {
    const cmd = new Command('test');
    cmd.description('Testing and validation commands');

    cmd
      .command('validate')
      .description('Validate protobuf specifications')
      .option('-i, --id <id>', 'Validate specific specification by ID')
      .option('-f, --file <file>', 'Validate local proto file')
      .option('-d, --directory <dir>', 'Validate all proto files in directory')
      .option('--staged', 'Validate staged git files only')
      .option('--rules <rules>', 'Comma-separated list of rules to run')
      .action(async (options) => {
        await this.validate(options);
      });

    cmd
      .command('compatibility')
      .description('Test compatibility between versions')
      .option('-b, --base <id>', 'Base specification ID')
      .option('-t, --target <id>', 'Target specification ID')
      .option('--breaking-changes', 'Check for breaking changes only')
      .action(async (options) => {
        await this.testCompatibility(options);
      });

    cmd
      .command('generate-tests')
      .description('Generate test cases for specifications')
      .option('-i, --id <id>', 'Specification ID')
      .option('-o, --output <dir>', 'Output directory', './tests')
      .option('--language <lang>', 'Target language (go, java, python)', 'go')
      .action(async (options) => {
        await this.generateTests(options);
      });

    cmd
      .command('run-tests')
      .description('Run generated test cases')
      .option('-d, --directory <dir>', 'Test directory', './tests')
      .option('--language <lang>', 'Target language (go, java, python)', 'go')
      .action(async (options) => {
        await this.runTests(options);
      });

    cmd
      .command('benchmark')
      .description('Benchmark protobuf serialization performance')
      .option('-i, --id <id>', 'Specification ID')
      .option('--iterations <n>', 'Number of iterations', '1000')
      .action(async (options) => {
        await this.benchmark(options);
      });

    return cmd;
  }

  private initializeValidationRules(): ValidationRule[] {
    return [
      {
        name: 'syntax_version',
        description: 'Check if syntax version is specified',
        validate: (spec) => {
          const syntax = spec.spec_data?.syntax;
          if (!syntax) {
            return { passed: false, message: 'Syntax version not specified' };
          }
          if (!['proto2', 'proto3'].includes(syntax)) {
            return { passed: false, message: `Invalid syntax version: ${syntax}` };
          }
          return { passed: true, message: `Valid syntax: ${syntax}` };
        }
      },
      {
        name: 'package_name',
        description: 'Check if package name follows conventions',
        validate: (spec) => {
          const packageName = spec.spec_data?.package;
          if (!packageName) {
            return { passed: false, message: 'Package name not specified' };
          }
          if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/.test(packageName)) {
            return { passed: false, message: 'Package name should follow lowercase dot notation' };
          }
          return { passed: true, message: `Valid package name: ${packageName}` };
        }
      },
      {
        name: 'field_numbers',
        description: 'Check field number uniqueness and ranges',
        validate: (spec) => {
          const messages = spec.spec_data?.messages || [];
          for (const message of messages) {
            const fieldNumbers = new Set();
            const fields = message.fields || [];
            
            for (const field of fields) {
              if (fieldNumbers.has(field.number)) {
                return { passed: false, message: `Duplicate field number ${field.number} in message ${message.name}` };
              }
              fieldNumbers.add(field.number);
              
              if (field.number < 1 || field.number > 536870911) {
                return { passed: false, message: `Invalid field number ${field.number} in message ${message.name}` };
              }
              
              if (field.number >= 19000 && field.number <= 19999) {
                return { passed: false, message: `Reserved field number ${field.number} in message ${message.name}` };
              }
            }
          }
          return { passed: true, message: 'All field numbers are valid and unique' };
        }
      },
      {
        name: 'enum_values',
        description: 'Check enum value uniqueness and zero value',
        validate: (spec) => {
          const enums = spec.spec_data?.enums || [];
          for (const enumDef of enums) {
            const values = enumDef.values || [];
            const valueNumbers = new Set();
            let hasZeroValue = false;
            
            for (const value of values) {
              if (valueNumbers.has(value.number)) {
                return { passed: false, message: `Duplicate enum value ${value.number} in enum ${enumDef.name}` };
              }
              valueNumbers.add(value.number);
              
              if (value.number === 0) {
                hasZeroValue = true;
              }
            }
            
            if (!hasZeroValue && spec.spec_data?.syntax === 'proto3') {
              return { passed: false, message: `Enum ${enumDef.name} must have a zero value in proto3` };
            }
          }
          return { passed: true, message: 'All enum values are valid' };
        }
      },
      {
        name: 'service_methods',
        description: 'Check service method definitions',
        validate: (spec) => {
          const services = spec.spec_data?.services || [];
          for (const service of services) {
            const methods = service.methods || [];
            const methodNames = new Set();
            
            for (const method of methods) {
              if (methodNames.has(method.name)) {
                return { passed: false, message: `Duplicate method name ${method.name} in service ${service.name}` };
              }
              methodNames.add(method.name);
              
              if (!method.inputType || !method.outputType) {
                return { passed: false, message: `Method ${method.name} missing input or output type` };
              }
            }
          }
          return { passed: true, message: 'All service methods are valid' };
        }
      }
    ];
  }

  private async validate(options: any): Promise<void> {
    const spinner = ora('Running validation...').start();

    try {
      let specs: ProtobufSpec[] = [];
      
      if (options.id) {
        // Validate specific spec by ID
        if (!this.config.isAuthenticated()) {
          spinner.fail(chalk.red('Please login first: proto-cli auth login'));
          return;
        }
        
        const response = await this.api.getSpec(options.id);
        if (!response.success || !response.data) {
          spinner.fail(chalk.red('Failed to fetch specification: ' + response.error));
          return;
        }
        specs = [response.data];
        
      } else if (options.file) {
        // Validate local proto file
        const content = await fs.readFile(options.file, 'utf8');
        const spec = this.parseProtoFile(content, options.file);
        specs = [spec];
        
      } else if (options.directory) {
        // Validate directory of proto files
        const files = await glob('**/*.proto', { cwd: options.directory });
        for (const file of files) {
          const content = await fs.readFile(path.join(options.directory, file), 'utf8');
          const spec = this.parseProtoFile(content, file);
          specs.push(spec);
        }
        
      } else if (options.staged) {
        // Validate staged git files
        spinner.fail(chalk.red('Staged file validation not implemented yet'));
        return;
        
      } else {
        // Validate all specs from manager
        if (!this.config.isAuthenticated()) {
          spinner.fail(chalk.red('Please login first: proto-cli auth login'));
          return;
        }
        
        const response = await this.api.getSpecs({ page: 1, limit: 1000 });
        if (!response.success || !response.data) {
          spinner.fail(chalk.red('Failed to fetch specifications: ' + response.error));
          return;
        }
        specs = response.data.data;
      }

      spinner.succeed(chalk.green(`Found ${specs.length} specification(s) to validate`));

      // Filter rules if specified
      let rulesToRun = this.validationRules;
      if (options.rules) {
        const ruleNames = options.rules.split(',').map((r: string) => r.trim());
        rulesToRun = this.validationRules.filter(rule => ruleNames.includes(rule.name));
      }

      let totalTests = 0;
      let passedTests = 0;
      let failedTests = 0;

      console.log(chalk.bold(`\nRunning ${rulesToRun.length} validation rules...\n`));

      for (const spec of specs) {
        console.log(chalk.bold(`Validating: ${spec.title} v${spec.version}`));
        
        for (const rule of rulesToRun) {
          totalTests++;
          const result = rule.validate(spec);
          
          if (result.passed) {
            passedTests++;
            console.log(chalk.green(`  ✓ ${rule.name}: ${result.message}`));
          } else {
            failedTests++;
            console.log(chalk.red(`  ✗ ${rule.name}: ${result.message}`));
          }
        }
        console.log('');
      }

      // Summary
      console.log(chalk.bold('Validation Summary:'));
      console.log(chalk.green(`  Passed: ${passedTests}`));
      console.log(chalk.red(`  Failed: ${failedTests}`));
      console.log(chalk.gray(`  Total: ${totalTests}`));

      if (failedTests > 0) {
        process.exit(1);
      }

    } catch (error: any) {
      spinner.fail(chalk.red('Validation failed: ' + error.message));
      process.exit(1);
    }
  }

  private parseProtoFile(content: string, filename: string): ProtobufSpec {
    // Basic proto file parsing - can be enhanced with a proper parser
    return {
      title: path.basename(filename, '.proto'),
      version: '1.0.0',
      spec_data: {
        syntax: 'proto3',
        package: '',
        imports: [],
        messages: [],
        enums: [],
        services: []
      }
    };
  }

  private async testCompatibility(options: any): Promise<void> {
    if (!options.base || !options.target) {
      console.log(chalk.red('Both --base and --target specification IDs are required'));
      return;
    }

    if (!this.config.isAuthenticated()) {
      console.log(chalk.red('Please login first: proto-cli auth login'));
      return;
    }

    const spinner = ora('Testing compatibility...').start();

    try {
      const [baseResponse, targetResponse] = await Promise.all([
        this.api.getSpec(options.base),
        this.api.getSpec(options.target)
      ]);

      if (!baseResponse.success || !baseResponse.data) {
        spinner.fail(chalk.red('Failed to fetch base specification: ' + baseResponse.error));
        return;
      }

      if (!targetResponse.success || !targetResponse.data) {
        spinner.fail(chalk.red('Failed to fetch target specification: ' + targetResponse.error));
        return;
      }

      const baseSpec = baseResponse.data;
      const targetSpec = targetResponse.data;

      spinner.succeed(chalk.green(`Testing compatibility: ${baseSpec.title} v${baseSpec.version} → ${targetSpec.title} v${targetSpec.version}`));

      const compatibilityIssues = this.checkCompatibility(baseSpec, targetSpec);

      if (compatibilityIssues.length === 0) {
        console.log(chalk.green('\n✓ No compatibility issues found'));
      } else {
        console.log(chalk.red(`\n✗ Found ${compatibilityIssues.length} compatibility issue(s):`));
        compatibilityIssues.forEach(issue => {
          const icon = issue.breaking ? '💥' : '⚠️';
          const color = issue.breaking ? chalk.red : chalk.yellow;
          console.log(color(`  ${icon} ${issue.type}: ${issue.message}`));
        });

        if (compatibilityIssues.some(issue => issue.breaking)) {
          process.exit(1);
        }
      }

    } catch (error: any) {
      spinner.fail(chalk.red('Compatibility test failed: ' + error.message));
    }
  }

  private checkCompatibility(baseSpec: ProtobufSpec, targetSpec: ProtobufSpec): Array<{type: string, message: string, breaking: boolean}> {
    const issues: Array<{type: string, message: string, breaking: boolean}> = [];

    // Check for removed fields
    const baseMessages = baseSpec.spec_data?.messages || [];
    const targetMessages = targetSpec.spec_data?.messages || [];

    for (const baseMessage of baseMessages) {
      const targetMessage = targetMessages.find((m: any) => m.name === baseMessage.name);
      if (!targetMessage) {
        issues.push({
          type: 'REMOVED_MESSAGE',
          message: `Message '${baseMessage.name}' was removed`,
          breaking: true
        });
        continue;
      }

      const baseFields = baseMessage.fields || [];
      const targetFields = targetMessage.fields || [];

      for (const baseField of baseFields) {
        const targetField = targetFields.find((f: any) => f.number === baseField.number);
        if (!targetField) {
          issues.push({
            type: 'REMOVED_FIELD',
            message: `Field '${baseField.name}' (${baseField.number}) was removed from message '${baseMessage.name}'`,
            breaking: true
          });
        } else if (baseField.type !== targetField.type) {
          issues.push({
            type: 'CHANGED_FIELD_TYPE',
            message: `Field '${baseField.name}' type changed from '${baseField.type}' to '${targetField.type}' in message '${baseMessage.name}'`,
            breaking: true
          });
        }
      }
    }

    return issues;
  }

  private async generateTests(options: any): Promise<void> {
    console.log(chalk.yellow('Test generation coming soon...'));
    // Generate test cases for different languages
  }

  private async runTests(options: any): Promise<void> {
    console.log(chalk.yellow('Test execution coming soon...'));
    // Run generated test cases
  }

  private async benchmark(options: any): Promise<void> {
    console.log(chalk.yellow('Benchmarking coming soon...'));
    // Performance benchmarking
  }
}