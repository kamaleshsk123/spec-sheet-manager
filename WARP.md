# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Architecture Overview

This is a **full-stack Protocol Buffer specification management system** consisting of three main components:

### 1. Frontend (Angular SPA)
- **Location**: Root directory (`src/`)
- **Framework**: Angular 20+ with TypeScript
- **UI**: Angular Material + Tailwind CSS
- **Key Features**: Monaco Editor integration for Protobuf editing, dashboard with team/personal workspaces, GitHub integration modals

### 2. Backend (Node.js API)
- **Location**: `backend/`
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with custom migrations
- **Authentication**: JWT-based with bcrypt password hashing
- **Key Features**: RESTful API, role-based access control (team owners vs members), GitHub integration via Octokit

### 3. CLI Tool
- **Location**: `cli/`
- **Framework**: Node.js with Commander.js
- **Purpose**: Automation, CI/CD integration, git workflows for Protobuf specs

### Data Model
The system manages:
- **Users** with GitHub integration
- **Teams** with owner/member relationships and cascading deletes
- **Protobuf Specs** with versioning, team association, and GitHub repo linking

## Development Commands

### Full Stack Development

```bash
# Initial setup (run from root)
npm install                    # Install frontend dependencies
cd backend && npm install      # Install backend dependencies  
cd ../cli && npm install       # Install CLI dependencies

# Database setup (PostgreSQL required)
cp backend/.env.example backend/.env  # Configure database connection
cd backend && npm run build && npm run db:migrate
```

### Frontend Development

```bash
# Development server (serves on http://localhost:4200)
npm start                      # or ng serve

# Build for production
npm run build                  # or ng build

# Run tests
npm test                       # or ng test

# Development build with file watching
npm run watch                  # or ng build --watch --configuration development
```

### Backend Development

```bash
cd backend

# Development server with hot reload (runs on http://localhost:3000)
npm run dev

# Production build and start
npm run build
npm start

# Database operations
npm run db:migrate             # Run migrations
npm run db:seed               # Seed database (if available)
```

### CLI Development

```bash
cd cli

# Development mode
npm run dev

# Build and test locally  
npm run build
npm start

# Run tests
npm test
```

### Testing

```bash
# Frontend tests (Jasmine + Karma)
npm test                       # Run once
npm run test:watch            # Watch mode

# Backend - no explicit test setup found in package.json
cd backend
# Tests would typically be: npm test

# CLI tests  
cd cli
npm test                       # Jest tests
```

## Architecture Patterns

### Frontend Architecture
- **Services**: Centralized API communication (`services/api.service.ts`) and notifications
- **Components**: Feature-based structure with reusable modals (publish, version history, push-to-branch)
- **Routing**: Standard Angular routing with guards for authentication
- **State Management**: Service-based state without external state management library
- **Editor Integration**: Monaco Editor for Protobuf syntax highlighting and editing

### Backend Architecture
- **Layered Architecture**: Routes → Controllers → Database
- **Middleware Stack**: Auth, validation (Joi), logging (Morgan), security (Helmet)
- **Database Layer**: Raw PostgreSQL queries with TypeScript interfaces
- **Authentication Flow**: JWT tokens with middleware-based protection
- **API Design**: RESTful with consistent error handling and response format

### Key Integration Points
- **GitHub Integration**: Octokit for repository creation and branch operations
- **Team Management**: Cascading deletes via database constraints (ON DELETE CASCADE/SET NULL)
- **Role-Based Access**: Team ownership model with frontend/backend authorization checks
- **Cross-Component Communication**: Frontend components use services for modal management and API calls

### Database Schema Notes
- `users` table has GitHub integration fields
- `teams` table with `owner_id` foreign key relationship  
- `team_members` join table for many-to-many user-team relationships
- `protobuf_specs` with `team_id` for team association and GitHub repo information

## Development Notes

### Environment Configuration
- Frontend environment files: `src/environments/environment.ts` and `src/environments/environment.prod.ts`
- Backend uses `.env` file for database connection and JWT secrets
- Both frontend and backend have CORS configured for cross-origin requests

### Key Dependencies
- **Frontend**: Angular Material, Monaco Editor (`@ng-util/monaco-editor`), proto-parser
- **Backend**: Express.js, PostgreSQL (`pg`), JWT, Octokit, Joi validation
- **CLI**: Commander.js, Inquirer, Chalk for CLI UX, Simple-Git for Git operations

### Development Workflow Considerations
- Database migrations are manual TypeScript files in `backend/src/scripts/`
- Frontend uses Angular CLI with standard build configurations
- Hot reload available for both frontend (`ng serve`) and backend (`nodemon`)
- The system supports both personal and team-based Protobuf spec management

### Common Tasks
- **Adding new API endpoints**: Add to `backend/src/routes/`, implement in `backend/src/controllers/`
- **New frontend features**: Follow Angular component structure with services for API calls
- **Database changes**: Create new migration scripts in `backend/src/scripts/`
- **CLI extensions**: Add new commands in `cli/src/` using Commander.js patterns