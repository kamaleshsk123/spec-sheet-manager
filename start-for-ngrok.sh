#!/bin/bash

echo "🎨 Starting Angular for ngrok..."
echo "This will allow external hosts"

# Get the ngrok URL from user or use a wildcard
echo "Starting with host bypass..."

# Start Angular with basic settings (angular.json should handle allowedHosts)
ng serve --host 0.0.0.0 --port 4200

echo "🛑 Angular stopped"