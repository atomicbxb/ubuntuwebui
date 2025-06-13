#!/bin/bash

# Set proper permissions for root
chmod 755 /root

# Install Node.js dependencies if not installed
if [ ! -d "node_modules" ]; then
    npm install
fi

# Start the web terminal server
echo "Starting Ubuntu Web Terminal..."
echo "Root access enabled without password"
echo "Web authentication required"

exec node server.js
