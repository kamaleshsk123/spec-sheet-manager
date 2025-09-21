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
exports.TestCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
const api_1 = require("../services/api");
const config_1 = require("../services/config");
class TestCommand {
    constructor() {
        this.api = new api_1.ApiService();
        this.config = new config_1.Config();
        this.validationRules = this.initializeValidationRules();
    }
    getCommand() {
        const cmd = new commander_1.Command('test');
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
    initializeValidationRules() {
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
    async validate(options) {
        const spinner = (0, ora_1.default)('Running validation...').start();
        try {
            let specs = [];
            if (options.id) {
                // Validate specific spec by ID
                if (!this.config.isAuthenticated()) {
                    spinner.fail(chalk_1.default.red('Please login first: proto-cli auth login'));
                    return;
                }
                const response = await this.api.getSpec(options.id);
                if (!response.success || !response.data) {
                    spinner.fail(chalk_1.default.red('Failed to fetch specification: ' + response.error));
                    return;
                }
                specs = [response.data];
            }
            else if (options.file) {
                // Validate local proto file
                const content = await fs.readFile(options.file, 'utf8');
                const spec = this.parseProtoFile(content, options.file);
                specs = [spec];
            }
            else if (options.directory) {
                // Validate directory of proto files
                const files = await (0, glob_1.glob)('**/*.proto', { cwd: options.directory });
                for (const file of files) {
                    const content = await fs.readFile(path.join(options.directory, file), 'utf8');
                    const spec = this.parseProtoFile(content, file);
                    specs.push(spec);
                }
            }
            else if (options.staged) {
                // Validate staged git files
                spinner.fail(chalk_1.default.red('Staged file validation not implemented yet'));
                return;
            }
            else {
                // Validate all specs from manager
                if (!this.config.isAuthenticated()) {
                    spinner.fail(chalk_1.default.red('Please login first: proto-cli auth login'));
                    return;
                }
                const response = await this.api.getSpecs({ page: 1, limit: 1000 });
                if (!response.success || !response.data) {
                    spinner.fail(chalk_1.default.red('Failed to fetch specifications: ' + response.error));
                    return;
                }
                specs = response.data.data;
            }
            spinner.succeed(chalk_1.default.green(`Found ${specs.length} specification(s) to validate`));
            // Filter rules if specified
            let rulesToRun = this.validationRules;
            if (options.rules) {
                const ruleNames = options.rules.split(',').map((r) => r.trim());
                rulesToRun = this.validationRules.filter(rule => ruleNames.includes(rule.name));
            }
            let totalTests = 0;
            let passedTests = 0;
            let failedTests = 0;
            console.log(chalk_1.default.bold(`\nRunning ${rulesToRun.length} validation rules...\n`));
            for (const spec of specs) {
                console.log(chalk_1.default.bold(`Validating: ${spec.title} v${spec.version}`));
                for (const rule of rulesToRun) {
                    totalTests++;
                    const result = rule.validate(spec);
                    if (result.passed) {
                        passedTests++;
                        console.log(chalk_1.default.green(`  ✓ ${rule.name}: ${result.message}`));
                    }
                    else {
                        failedTests++;
                        console.log(chalk_1.default.red(`  ✗ ${rule.name}: ${result.message}`));
                    }
                }
                console.log('');
            }
            // Summary
            console.log(chalk_1.default.bold('Validation Summary:'));
            console.log(chalk_1.default.green(`  Passed: ${passedTests}`));
            console.log(chalk_1.default.red(`  Failed: ${failedTests}`));
            console.log(chalk_1.default.gray(`  Total: ${totalTests}`));
            if (failedTests > 0) {
                process.exit(1);
            }
        }
        catch (error) {
            spinner.fail(chalk_1.default.red('Validation failed: ' + error.message));
            process.exit(1);
        }
    }
    parseProtoFile(content, filename) {
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
    async testCompatibility(options) {
        if (!options.base || !options.target) {
            console.log(chalk_1.default.red('Both --base and --target specification IDs are required'));
            return;
        }
        if (!this.config.isAuthenticated()) {
            console.log(chalk_1.default.red('Please login first: proto-cli auth login'));
            return;
        }
        const spinner = (0, ora_1.default)('Testing compatibility...').start();
        try {
            const [baseResponse, targetResponse] = await Promise.all([
                this.api.getSpec(options.base),
                this.api.getSpec(options.target)
            ]);
            if (!baseResponse.success || !baseResponse.data) {
                spinner.fail(chalk_1.default.red('Failed to fetch base specification: ' + baseResponse.error));
                return;
            }
            if (!targetResponse.success || !targetResponse.data) {
                spinner.fail(chalk_1.default.red('Failed to fetch target specification: ' + targetResponse.error));
                return;
            }
            const baseSpec = baseResponse.data;
            const targetSpec = targetResponse.data;
            spinner.succeed(chalk_1.default.green(`Testing compatibility: ${baseSpec.title} v${baseSpec.version} → ${targetSpec.title} v${targetSpec.version}`));
            const compatibilityIssues = this.checkCompatibility(baseSpec, targetSpec);
            if (compatibilityIssues.length === 0) {
                console.log(chalk_1.default.green('\n✓ No compatibility issues found'));
            }
            else {
                console.log(chalk_1.default.red(`\n✗ Found ${compatibilityIssues.length} compatibility issue(s):`));
                compatibilityIssues.forEach(issue => {
                    const icon = issue.breaking ? '💥' : '⚠️';
                    const color = issue.breaking ? chalk_1.default.red : chalk_1.default.yellow;
                    console.log(color(`  ${icon} ${issue.type}: ${issue.message}`));
                });
                if (compatibilityIssues.some(issue => issue.breaking)) {
                    process.exit(1);
                }
            }
        }
        catch (error) {
            spinner.fail(chalk_1.default.red('Compatibility test failed: ' + error.message));
        }
    }
    checkCompatibility(baseSpec, targetSpec) {
        const issues = [];
        // Check for removed fields
        const baseMessages = baseSpec.spec_data?.messages || [];
        const targetMessages = targetSpec.spec_data?.messages || [];
        for (const baseMessage of baseMessages) {
            const targetMessage = targetMessages.find((m) => m.name === baseMessage.name);
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
                const targetField = targetFields.find((f) => f.number === baseField.number);
                if (!targetField) {
                    issues.push({
                        type: 'REMOVED_FIELD',
                        message: `Field '${baseField.name}' (${baseField.number}) was removed from message '${baseMessage.name}'`,
                        breaking: true
                    });
                }
                else if (baseField.type !== targetField.type) {
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
    async generateTests(options) {
        console.log(chalk_1.default.yellow('Test generation coming soon...'));
        // Generate test cases for different languages
    }
    async runTests(options) {
        console.log(chalk_1.default.yellow('Test execution coming soon...'));
        // Run generated test cases
    }
    async benchmark(options) {
        console.log(chalk_1.default.yellow('Benchmarking coming soon...'));
        // Performance benchmarking
    }
}
exports.TestCommand = TestCommand;
//# sourceMappingURL=test.js.map