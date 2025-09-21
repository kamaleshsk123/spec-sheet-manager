# Protobuf Spec Editor - Backend API

A Node.js/Express backend API for the Protobuf Spec Editor with PostgreSQL database.

## Features

- 🔐 JWT Authentication (register, login, profile)
- 📝 CRUD operations for Protobuf specifications
- 📊 Dashboard with analytics
- 🔍 Search and filtering capabilities
- 📈 Version history tracking
- 🏷️ Tagging system
- 📥 Download tracking
- 🔒 Role-based access control

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Validation**: Joi
- **Security**: Helmet, CORS, bcrypt

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Database Setup

Install PostgreSQL and create a database:

```sql
CREATE DATABASE protobuf_specs;
CREATE USER your_username WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE protobuf_specs TO your_username;
```

### 3. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
DATABASE_URL=postgresql://your_username:your_password@localhost:5432/protobuf_specs
DB_HOST=localhost
DB_PORT=5432
DB_NAME=protobuf_specs
DB_USER=your_username
DB_PASSWORD=your_password

PORT=3000
NODE_ENV=development

JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

FRONTEND_URL=http://localhost:4200
```

### 4. Run Database Migrations

```bash
npm run build
npm run db:migrate
```

### 5. Start the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)

### Specifications
- `GET /api/specs` - List specifications (with pagination, search, filters)
- `POST /api/specs` - Create new specification (protected)
- `GET /api/specs/:id` - Get specific specification
- `PUT /api/specs/:id` - Update specification (protected)
- `DELETE /api/specs/:id` - Delete specification (protected)
- `GET /api/specs/:id/versions` - Get specification version history
- `POST /api/specs/:id/download` - Increment download count
- `GET /api/specs/dashboard/stats` - Get dashboard statistics (protected)

### Health Check
- `GET /health` - API health status

## API Usage Examples

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "password": "password123"
  }'
```

### Create Specification
```bash
curl -X POST http://localhost:3000/api/specs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "User Service API",
    "version": "1.0.0",
    "description": "User management service",
    "spec_data": {
      "syntax": "proto3",
      "package": "user.v1",
      "imports": [],
      "messages": [],
      "enums": [],
      "services": []
    },
    "tags": ["user", "api"]
  }'
```

### Search Specifications
```bash
curl "http://localhost:3000/api/specs?search=user&page=1&limit=10&sort_by=created_at&sort_order=desc"
```

## Database Schema

The API uses the following main tables:

- `users` - User accounts
- `protobuf_specs` - Protobuf specifications
- `spec_versions` - Version history

## Development

### Project Structure
```
backend/
├── src/
│   ├── config/         # Database and app configuration
│   ├── controllers/    # Request handlers
│   ├── middleware/     # Authentication, validation, etc.
│   ├── models/         # TypeScript interfaces and types
│   ├── routes/         # API route definitions
│   ├── scripts/        # Database migration scripts
│   └── server.ts       # Main application file
├── dist/               # Compiled JavaScript (generated)
└── package.json
```

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run db:migrate` - Run database migrations

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Request validation with Joi
- SQL injection prevention
- CORS protection
- Security headers with Helmet
- Rate limiting ready (can be added)

## Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET`
3. Configure proper database credentials
4. Set up SSL/TLS
5. Configure reverse proxy (nginx)
6. Set up monitoring and logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request