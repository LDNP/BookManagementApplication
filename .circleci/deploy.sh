#!/usr/bin/env bash

# Update packages and install Node.js & npm
sudo apt update && sudo apt install -y nodejs npm

# Install PM2 if not already installed
sudo npm install -g pm2

# Navigate to the project directory
cd ~/BookManagementApplication || exit 1

# Stop the current running application (if running)
pm2 stop book_app || true

# Install backend dependencies
cd backend
npm install

# Go to frontend, install dependencies and build
cd ../frontend
npm install
npm run build

# Start the application with PM2
cd ../backend
pm2 start server.js --name book_app --env=production

# Save the PM2 process list so it starts on reboot
pm2 save

echo "Deployment completed successfully!"