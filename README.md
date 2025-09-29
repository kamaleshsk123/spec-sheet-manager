# Spec Sheet Manager

This document provides instructions on how to set up and run the frontend, backend, and database for the Spec Sheet Manager application.

## Database Setup (PostgreSQL)

1.  **Install PostgreSQL:**
    If you don't have PostgreSQL installed, you can download it from [postgresql.org](https://www.postgresql.org/download/).

2.  **Create a database and user:**
    You can use the following SQL commands to create a database and a user for this application.

    ```sql
    CREATE DATABASE protobuf_specs;
    CREATE USER protobuf WITH PASSWORD '''protobuf''';
    GRANT ALL PRIVILEGES ON DATABASE protobuf_specs TO protobuf;
    ```

3.  **Environment Variables:**
    The backend uses a `.env` file for configuration. In the `backend` directory, create a `.env` file by copying the `.env.example`:

    ```bash
    cp backend/.env.example backend/.env
    ```

    Update the `backend/.env` file with your database connection details if they are different from the defaults.

    ```
    DATABASE_URL=postgresql://protobuf:protobuf@localhost:5432/protobuf_specs
    DB_HOST=localhost
    DB_PORT=5432
    DB_NAME=protobuf_specs
    DB_USER=protobuf
    DB_PASSWORD=protobuf
    ```

4.  **Run Migrations:**
    After setting up the database and the `.env` file, run the database migrations from the `backend` directory:

    ```bash
    cd backend
    npm install
    npm run build
    npm run db:migrate
    cd ..
    ```

## Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the backend server (development):**
    ```bash
    npm run dev
    ```
    The backend will be running on `http://localhost:3000`.

4.  **Run the backend server (production):**
    ```bash
    npm run build
    npm start
    ```

## Frontend Setup

1.  **Navigate to the root directory:**
    ```bash
    cd /home/user/Desktop/myCode/Protobuf/Protobuf_Gitpush/spec-sheet-manager
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the frontend application:**
    ```bash
    npm start
    ```
    The frontend will be running on `http://localhost:4200`.