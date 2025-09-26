# Protobuf Manager CLI

A powerful command-line interface for the Protobuf Specification Manager, enabling automation, CI/CD integration, and advanced workflow management.

## 🚀 Features

- **Authentication Management** - Login/logout with secure token storage
- **Specification Management** - Create, read, update, delete specifications
- **Version Comparison** - Advanced diff capabilities with breaking change detection
- **Git Integration** - Sync specifications with version control
- **Automated Testing** - Validate schemas and test compatibility
- **CI/CD Ready** - Perfect for automation pipelines

## 📦 Installation

### From NPM (Recommended)
```bash
npm install -g protobuf-manager-cli
```

### From Source
```bash
git clone <repository>
cd cli
npm install
npm run build
npm link
```

## 🔧 Quick Start

### 1. Setup Configuration
```bash
proto-cli config setup
```

### 2. Login
```bash
proto-cli auth login
```

### 3. List Specifications
```bash
proto-cli spec list
```

## 📚 Commands

### Authentication
```bash
# Login to the manager
proto-cli auth login

# Check authentication status
proto-cli auth status

# Logout
proto-cli auth logout
```

### Specification Management
```bash
# List all specifications
proto-cli spec list

# Get a specific specification
proto-cli spec get <id>

# Create new specification
proto-cli spec create --title "My API" --version "1.0.0"

# Create from proto file
proto-cli spec create --file ./my-api.proto

# Export specification
proto-cli spec export <id> --format proto --output ./exported.proto

# Publish specification
proto-cli spec publish <id>

# Delete specification
proto-cli spec delete <id>
```

### Version Comparison
```bash
# Compare two versions
proto-cli compare versions <spec1-id> <spec2-id>

# Export comparison as HTML
proto-cli compare versions <spec1-id> <spec2-id> --format html --output diff.html

# Detect breaking changes
proto-cli compare breaking-changes <spec1-id> <spec2-id>
```

### Git Integration
```bash
# Initialize git integration
proto-cli git init

# Sync specifications to git
proto-cli git sync

# Sync and push to remote
proto-cli git sync --push

# Pull from git
proto-cli git pull

# Check git status
proto-cli git status

# Setup git hooks
proto-cli git hook --pre-commit --post-commit
```

### Testing & Validation
```bash
# Validate all specifications
proto-cli test validate

# Validate specific specification
proto-cli test validate --id <spec-id>

# Validate local proto file
proto-cli test validate --file ./my-api.proto

# Validate directory of proto files
proto-cli test validate --directory ./protos

# Test compatibility between versions
proto-cli test compatibility --base <spec1-id> --target <spec2-id>

# Run specific validation rules
proto-cli test validate --rules "syntax_version,field_numbers"
```

### Configuration
```bash
# Interactive setup
proto-cli config setup

# List all configuration
proto-cli config list

# Get specific config value
proto-cli config get apiUrl

# Set configuration value
proto-cli config set apiUrl "https://api.example.com"

# Reset configuration
proto-cli config reset
```

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: Protobuf Validation
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install Protobuf CLI
        run: npm install -g protobuf-manager-cli
        
      - name: Configure CLI
        run: |
          proto-cli config set apiUrl "${{ secrets.PROTOBUF_API_URL }}"
          echo "${{ secrets.PROTOBUF_TOKEN }}" | proto-cli auth login --token
          
      - name: Validate Proto Files
        run: proto-cli test validate --directory ./protos
        
      - name: Test Compatibility
        if: github.event_name == 'pull_request'
        run: proto-cli test compatibility --base main --target HEAD
```

### Jenkins Pipeline Example
```groovy
pipeline {
    agent any
    
    stages {
        stage('Setup') {
            steps {
                sh 'npm install -g protobuf-manager-cli'
                sh 'proto-cli config set apiUrl "${PROTOBUF_API_URL}"'
            }
        }
        
        stage('Validate') {
            steps {
                sh 'proto-cli test validate --directory ./protos'
            }
        }
        
        stage('Deploy') {
            when { branch 'main' }
            steps {
                sh 'proto-cli git sync --push'
            }
        }
    }
}
```

## 🛠️ Git Integration Workflow

### 1. Initialize Git Integration
```bash
proto-cli git init --directory ./my-protos
cd my-protos
```

### 2. Setup Remote Repository
```bash
git remote add origin https://github.com/your-org/protobuf-specs.git
```

### 3. Sync Specifications
```bash
proto-cli git sync --message "Initial sync" --push
```

### 4. Setup Automated Hooks
```bash
proto-cli git hook --pre-commit --post-commit
```

This creates:
- **Pre-commit hook**: Validates proto files before commit
- **Post-commit hook**: Syncs changes back to the manager

## 📋 Validation Rules

The CLI includes comprehensive validation rules:

- **syntax_version**: Ensures valid proto syntax (proto2/proto3)
- **package_name**: Validates package naming conventions
- **field_numbers**: Checks field number uniqueness and ranges
- **enum_values**: Validates enum values and zero values
- **service_methods**: Checks service method definitions

### Custom Validation
```bash
# Run specific rules only
proto-cli test validate --rules "syntax_version,field_numbers"

# Validate with custom rules file
proto-cli test validate --rules-file ./custom-rules.json
```

## 🔧 Configuration Options

| Key | Description | Default |
|-----|-------------|---------|
| `apiUrl` | Protobuf Manager API URL | `http://localhost:3000/api` |
| `authToken` | Authentication token | - |
| `defaultFormat` | Default output format | `table` |
| `gitIntegration` | Enable git integration | `false` |
| `autoTest` | Enable automatic testing | `true` |

## 🐛 Troubleshooting

### Authentication Issues
```bash
# Check authentication status
proto-cli auth status

# Clear and re-login
proto-cli auth logout
proto-cli auth login
```

### Git Integration Issues
```bash
# Check git status
proto-cli git status

# Reinitialize if needed
proto-cli git init --directory ./proto-specs
```

### Validation Failures
```bash
# Run validation with verbose output
proto-cli test validate --verbose

# Check specific rules
proto-cli test validate --rules "field_numbers" --verbose
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- GitHub Issues: [Report bugs and request features]
- Documentation: [Full documentation]
- Community: [Join our Discord]

---

**Made with ❤️ for the Protocol Buffer community**