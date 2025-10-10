#!/bin/bash

echo "🌐 Starting ngrok tunnels for both frontend and backend..."
echo "Make sure your app is running on ports 4200 and 3000!"
echo ""

# Start ngrok with both tunnels
ngrok start --all --config ngrok.yml

echo "🛑 ngrok stopped"