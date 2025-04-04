#!/bin/bash

# Set environment variables
export NODE_ENV=production

# Navigate to project directory
cd ~/BookManagementApplication

# Write certificates to files with proper quoting
echo "$PRIVATE_KEY" > backend/private.pem
echo "$SERVER" > backend/server.crt

# Set proper permissions on key files
chmod 600 backend/private.pem
chmod 644 backend/server.crt

# Install backend dependencies
cd backend
npm install
npm rebuild sqlite3

# Start or restart the application with PM2
pm2 stop book_app || true
pm2 start server.js --name book_app

echo "Deployment completed successfully"