#!/bin/bash

echo "🔄 Restarting application for ngrok compatibility..."

# Kill any existing processes on ports 4200 and 3000
echo "🛑 Stopping existing processes..."
pkill -f "ng serve" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true

sleep 2

# Start backend
echo "🔧 Starting Backend..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

sleep 3

# Start frontend with ngrok-compatible settings
echo "🎨 Starting Frontend (ngrok-compatible)..."
ng serve --host 0.0.0.0 --port 4200 &
FRONTEND_PID=$!

echo "✅ Application restarted!"
echo "📱 Frontend: http://localhost:4200"
echo "🔧 Backend: http://localhost:3000"
echo ""
echo "Now you can run: ./start-frontend-ngrok.sh"
echo ""
echo "Press Ctrl+C to stop all services"

# Cleanup function
cleanup() {
    echo "🛑 Stopping all services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    pkill -f "ng serve" 2>/dev/null || true
    pkill -f "nodemon" 2>/dev/null || true
    exit
}

trap cleanup SIGINT SIGTERM
wait