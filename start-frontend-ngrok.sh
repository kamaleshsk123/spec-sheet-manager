#!/bin/bash

echo "🌐 Starting ngrok tunnel for frontend only..."
echo "Your app should be running on http://localhost:4200"
echo ""

# Start ngrok for frontend only
ngrok http 4200

echo "🛑 ngrok stopped"