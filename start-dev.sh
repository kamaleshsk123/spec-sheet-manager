#!/bin/bash

echo "🚀 Starting Full Stack Application with ngrok..."

# Start PostgreSQL (if not running)
echo "📊 Starting PostgreSQL..."
# Uncomment one of these based on your system:
# sudo service postgresql start  # Linux
# brew services start postgresql  # macOS
# pg_ctl -D /usr/local/var/postgres start  # Manual start

# Start Backend
echo "🔧 Starting Backend Server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 5

# Start ngrok tunnels
echo "🌐 Starting ngrok tunnels..."
ngrok start --all --config ngrok.yml &
NGROK_PID=$!

# Wait for ngrok to start
sleep 2

# Update frontend with ngrok URL
echo "🔗 Updating frontend with ngrok URL..."
node update-ngrok-urls.js

echo "🔍 Verifying updated environment file:"
cat src/environments/environment.ts

# Start Frontend
echo "🎨 Starting Frontend Server..."
npm start &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 10

echo "✅ All services started!"
echo "📱 Frontend: http://localhost:4200"
echo "🔧 Backend: http://localhost:3000"
echo "🌐 Check ngrok dashboard: http://localhost:4040"

# Function to cleanup on exit
cleanup() {
    echo "🛑 Stopping all services..."
    kill $BACKEND_PID $FRONTEND_PID $NGROK_PID 2>/dev/null
    exit
}

# Trap cleanup function on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop
echo "Press Ctrl+C to stop all services"
wait