#!/bin/bash

echo "🌐 Starting ngrok tunnels..."
echo "Make sure your app is running first!"
echo ""

# Start ngrok for frontend in background
echo "📱 Starting frontend tunnel (port 4200)..."
ngrok http 4200 --log=stdout > ngrok-frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 3

# Start ngrok for backend in background  
echo "🔧 Starting backend tunnel (port 3000)..."
ngrok http 3000 --log=stdout > ngrok-backend.log 2>&1 &
BACKEND_PID=$!

sleep 5

echo ""
echo "✅ ngrok tunnels started!"
echo "🌐 Check ngrok dashboard: http://localhost:4040"
echo ""
echo "📱 Frontend tunnel info:"
curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*4200[^"]*"' | head -1
echo ""
echo "🔧 Backend tunnel info:"  
curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*3000[^"]*"' | head -1
echo ""
echo "Press Ctrl+C to stop ngrok tunnels"

# Cleanup function
cleanup() {
    echo "🛑 Stopping ngrok tunnels..."
    kill $FRONTEND_PID $BACKEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM
wait