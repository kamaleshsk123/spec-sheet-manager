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
exports.SpecCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const table_1 = require("table");
const fs = __importStar(require("fs-extra"));
const inquirer_1 = __importDefault(require("inquirer"));
const api_1 = require("../services/api");
const config_1 = require("../services/config");
class SpecCommand {
    constructor() {
        this.api = new api_1.ApiService();
        this.config = new config_1.Config();
    }
    getCommand() {
        const cmd = new commander_1.Command('spec');
        cmd.description('Specification management commands');
        cmd
            .command('list')
            .alias('ls')
            .description('List all specifications')
            .option('-f, --format <format>', 'Output format (table, json, yaml)', 'table')
            .option('--published', 'Show only published specs')
            .action(async (options) => {
            await this.list(options);
        });
        cmd
            .command('get <id>')
            .description('Get a specific specification')
            .option('-f, --format <format>', 'Output format (json, yaml, proto)', 'proto')
            .option('-o, --output <file>', 'Output to file')
            .action(async (id, options) => {
            await this.get(id, options);
        });
        cmd
            .command('create')
            .description('Create a new specification')
            .option('-f, --file <file>', 'Proto file to import')
            .option('-t, --title <title>', 'Specification title')
            .option('-v, --version <version>', 'Version number', '1.0.0')
            .option('-d, --description <description>', 'Description')
            .action(async (options) => {
            await this.create(options);
        });
        cmd
            .command('update <id>')
            .description('Update a specification')
            .option('-f, --file <file>', 'Proto file to import')
            .option('-t, --title <title>', 'Specification title')
            .option('-v, --version <version>', 'Version number')
            .option('-d, --description <description>', 'Description')
            .action(async (id, options) => {
            await this.update(id, options);
        });
        cmd
            .command('delete <id>')
            .description('Delete a specification')
            .option('-y, --yes', 'Skip confirmation')
            .action(async (id, options) => {
            await this.delete(id, options);
        });
        cmd
            .command('publish <id>')
            .description('Publish a specification')
            .action(async (id) => {
            await this.publish(id);
        });
        cmd
            .command('export <id>')
            .description('Export specification to various formats')
            .option('-f, --format <format>', 'Export format (proto, json, yaml)', 'proto')
            .option('-o, --output <file>', 'Output file')
            .action(async (id, options) => {
            await this.export(id, options);
        });
        return cmd;
    }
    async list(options) {
        if (!this.config.isAuthenticated()) {
            console.log(chalk_1.default.red('Please login first: proto-cli auth login'));
            return;
        }
        const spinner = (0, ora_1.default)('Fetching specifications...').start();
        try {
            const response = await this.api.getSpecs({ page: 1, limit: 100 });
            if (!response.success || !response.data) {
                spinner.fail(chalk_1.default.red('Failed to fetch specifications: ' + response.error));
                return;
            }
            let specs = response.data.data;
            if (options.published) {
                specs = specs.filter(spec => spec.is_published);
            }
            spinner.succeed(chalk_1.default.green(`Found ${specs.length} specifications`));
            if (specs.length === 0) {
                console.log(chalk_1.default.yellow('No specifications found.'));
                return;
            }
            switch (options.format) {
                case 'json':
                    console.log(JSON.stringify(specs, null, 2));
                    break;
                case 'yaml':
                    const yaml = require('yaml');
                    console.log(yaml.stringify(specs));
                    break;
                default:
                    this.printSpecTable(specs);
            }
        }
        catch (error) {
            spinner.fail(chalk_1.default.red('Error: ' + error.message));
        }
    }
    printSpecTable(specs) {
        const data = [
            ['ID', 'Title', 'Version', 'Published', 'Downloads', 'Created']
        ];
        specs.forEach(spec => {
            data.push([
                spec.id?.substring(0, 8) + '...' || 'N/A',
                spec.title,
                spec.version,
                spec.is_published ? chalk_1.default.green('Yes') : chalk_1.default.gray('No'),
                (spec.download_count || 0).toString(),
                spec.created_at ? new Date(spec.created_at).toLocaleDateString() : 'N/A'
            ]);
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
    async get(id, options) {
        if (!this.config.isAuthenticated()) {
            console.log(chalk_1.default.red('Please login first: proto-cli auth login'));
            return;
        }
        const spinner = (0, ora_1.default)('Fetching specification...').start();
        try {
            const response = await this.api.getSpec(id);
            if (!response.success || !response.data) {
                spinner.fail(chalk_1.default.red('Failed to fetch specification: ' + response.error));
                return;
            }
            const spec = response.data;
            spinner.succeed(chalk_1.default.green(`Fetched specification: ${spec.title}`));
            let output;
            switch (options.format) {
                case 'json':
                    output = JSON.stringify(spec, null, 2);
                    break;
                case 'yaml':
                    const yaml = require('yaml');
                    output = yaml.stringify(spec);
                    break;
                case 'proto':
                default:
                    output = this.generateProtoContent(spec);
            }
            if (options.output) {
                await fs.writeFile(options.output, output);
                console.log(chalk_1.default.green(`Saved to: ${options.output}`));
            }
            else {
                console.log(output);
            }
        }
        catch (error) {
            spinner.fail(chalk_1.default.red('Error: ' + error.message));
        }
    }
    generateProtoContent(spec) {
        if (!spec.spec_data) {
            return 'No content available';
        }
        const data = spec.spec_data;
        let protoContent = `syntax = "${data.syntax || 'proto3'}";\n\n`;
        if (data.package) {
            protoContent += `package ${data.package};\n\n`;
        }
        if (data.imports && data.imports.length > 0) {
            for (const importPath of data.imports) {
                protoContent += `import "${importPath}";\n`;
            }
            protoContent += '\n';
        }
        if (data.enums && data.enums.length > 0) {
            for (const enumItem of data.enums) {
                protoContent += `enum ${enumItem.name} {\n`;
                if (enumItem.values) {
                    for (const value of enumItem.values) {
                        protoContent += `  ${value.name} = ${value.number};\n`;
                    }
                }
                protoContent += '}\n\n';
            }
        }
        if (data.messages && data.messages.length > 0) {
            for (const message of data.messages) {
                protoContent += this.generateMessageContent(message, 0);
            }
        }
        if (data.services && data.services.length > 0) {
            for (const service of data.services) {
                protoContent += `service ${service.name} {\n`;
                if (service.methods) {
                    for (const method of service.methods) {
                        const inputStream = method.streaming?.input ? 'stream ' : '';
                        const outputStream = method.streaming?.output ? 'stream ' : '';
                        protoContent += `  rpc ${method.name}(${inputStream}${method.inputType}) returns (${outputStream}${method.outputType});\n`;
                    }
                }
                protoContent += '}\n\n';
            }
        }
        return protoContent;
    }
    generateMessageContent(message, indent) {
        const spaces = '  '.repeat(indent);
        let content = `${spaces}message ${message.name} {\n`;
        if (message.nestedEnums) {
            for (const nestedEnum of message.nestedEnums) {
                content += `${spaces}  enum ${nestedEnum.name} {\n`;
                for (const value of nestedEnum.values) {
                    content += `${spaces}    ${value.name} = ${value.number};\n`;
                }
                content += `${spaces}  }\n\n`;
            }
        }
        if (message.nestedMessages) {
            for (const nestedMessage of message.nestedMessages) {
                content += this.generateMessageContent(nestedMessage, indent + 1);
            }
        }
        if (message.fields) {
            for (const field of message.fields) {
                const repeated = field.repeated ? 'repeated ' : '';
                const optional = field.optional ? 'optional ' : '';
                content += `${spaces}  ${repeated}${optional}${field.type} ${field.name} = ${field.number};\n`;
            }
        }
        content += `${spaces}}\n\n`;
        return content;
    }
    async create(options) {
        if (!this.config.isAuthenticated()) {
            console.log(chalk_1.default.red('Please login first: proto-cli auth login'));
            return;
        }
        // Interactive creation if no options provided
        if (!options.title && !options.file) {
            const answers = await inquirer_1.default.prompt([
                {
                    type: 'input',
                    name: 'title',
                    message: 'Specification title:',
                    validate: (input) => input.length > 0 || 'Title is required'
                },
                {
                    type: 'input',
                    name: 'version',
                    message: 'Version:',
                    default: '1.0.0'
                },
                {
                    type: 'input',
                    name: 'description',
                    message: 'Description (optional):'
                }
            ]);
            Object.assign(options, answers);
        }
        const spec = {
            title: options.title,
            version: options.version || '1.0.0',
            description: options.description,
            spec_data: {
                syntax: 'proto3',
                package: '',
                imports: [],
                messages: [],
                enums: [],
                services: []
            }
        };
        // Import from file if provided
        if (options.file) {
            try {
                const protoContent = await fs.readFile(options.file, 'utf8');
                // Simple proto parsing (can be enhanced)
                spec.spec_data = this.parseProtoContent(protoContent);
            }
            catch (error) {
                console.log(chalk_1.default.red('Failed to read proto file: ' + error.message));
                return;
            }
        }
        const spinner = (0, ora_1.default)('Creating specification...').start();
        try {
            const response = await this.api.createSpec(spec);
            if (response.success && response.data) {
                spinner.succeed(chalk_1.default.green(`Created specification: ${response.data.title} (${response.data.id})`));
            }
            else {
                spinner.fail(chalk_1.default.red('Failed to create specification: ' + response.error));
            }
        }
        catch (error) {
            spinner.fail(chalk_1.default.red('Error: ' + error.message));
        }
    }
    parseProtoContent(content) {
        // Basic proto parsing - can be enhanced with a proper parser
        return {
            syntax: 'proto3',
            package: '',
            imports: [],
            messages: [],
            enums: [],
            services: []
        };
    }
    async update(id, options) {
        // Implementation similar to create but for updates
        console.log(chalk_1.default.yellow('Update command implementation coming soon...'));
    }
    async delete(id, options) {
        if (!this.config.isAuthenticated()) {
            console.log(chalk_1.default.red('Please login first: proto-cli auth login'));
            return;
        }
        if (!options.yes) {
            const { confirm } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: `Are you sure you want to delete specification ${id}?`,
                    default: false
                }
            ]);
            if (!confirm) {
                console.log(chalk_1.default.yellow('Cancelled.'));
                return;
            }
        }
        const spinner = (0, ora_1.default)('Deleting specification...').start();
        try {
            const response = await this.api.deleteSpec(id);
            if (response.success) {
                spinner.succeed(chalk_1.default.green('Specification deleted successfully'));
            }
            else {
                spinner.fail(chalk_1.default.red('Failed to delete specification: ' + response.error));
            }
        }
        catch (error) {
            spinner.fail(chalk_1.default.red('Error: ' + error.message));
        }
    }
    async publish(id) {
        if (!this.config.isAuthenticated()) {
            console.log(chalk_1.default.red('Please login first: proto-cli auth login'));
            return;
        }
        const spinner = (0, ora_1.default)('Publishing specification...').start();
        try {
            const response = await this.api.publishSpec(id);
            if (response.success && response.data) {
                spinner.succeed(chalk_1.default.green(`Published specification: ${response.data.title}`));
            }
            else {
                spinner.fail(chalk_1.default.red('Failed to publish specification: ' + response.error));
            }
        }
        catch (error) {
            spinner.fail(chalk_1.default.red('Error: ' + error.message));
        }
    }
    async export(id, options) {
        // Reuse the get method with different default format
        await this.get(id, options);
    }
}
exports.SpecCommand = SpecCommand;
//# sourceMappingURL=spec.js.map