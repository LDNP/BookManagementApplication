#!/bin/bash

echo "Starting deploy script..."

# Navigate to the project directory
cd BookManagementApplication

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies and build it
echo "Installing frontend dependencies and building..."
cd frontend
npm install --legacy-peer-deps
export REACT_APP_API_BASE=https://34.251.18.39:8443
npm run build

# Check if the frontend build was successful
if [ ! -d "build" ] || [ ! -f "build/index.html" ]; then
   echo "Frontend build failed. Deployment aborted."
   exit 1
fi

# Copy frontend build to backend
echo "Copying frontend build to backend..."
rm -rf ../backend/build
cp -r build ../backend/

# Set up the environment variables
echo "Updating backend .env file..."
cat > ../backend/.env <<EOL
CORS_ORIGIN=*
PORT=8443
NODE_ENV=production
SSL_KEY_PATH=/home/ubuntu/privatekey.pem
SSL_CERT_PATH=/home/ubuntu/server.crt
EOL

# Navigate to the backend directory
cd ../backend

# Verify certificates exist
if [ ! -f /home/ubuntu/privatekey.pem ] || [ ! -f /home/ubuntu/server.crt ]; then
   echo "SSL certificate files not found in /home/ubuntu/."
   exit 1
fi

echo "SSL certificates verified successfully."

# Start or restart the app with PM2
echo "Starting app with PM2..."
pm2 restart book_app || pm2 start server.js --name book_app
pm2 save

echo "Deployment complete."
