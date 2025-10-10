#!/bin/bash

echo "🎨 Starting Angular with environment bypass..."

# Set environment variable to disable host check
export NG_CLI_ANALYTICS=false
export NODE_OPTIONS="--max-old-space-size=4096"

# Start Angular
ng serve --host 0.0.0.0 --port 4200

echo "🛑 Angular stopped"