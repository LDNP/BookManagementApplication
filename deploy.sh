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
rm -rf ../backend/build  # Remove the existing backend build directory
cp -r build ../backend/  # Copy the new frontend build to the backend directory

# Set up the environment variables
echo "Updating backend .env file..."
cat > ../backend/.env <<EOL
CORS_ORIGIN=*
PORT=8443
NODE_ENV=production
SSL_KEY_PATH=./privatekey.pem
SSL_CERT_PATH=./server.crt
EOL

# Navigate to the backend directory
cd ../backend

# Decode the base64 encoded certificates from environment variables
echo "Decoding SSL certificates from environment variables..."
echo "$SERVER" | base64 --decode > server.crt
echo "$KEY" | base64 --decode > privatekey.pem

# Set correct permissions for SSL certificates
echo "Setting permissions for SSL certificates..."
chmod 644 server.crt
chmod 600 privatekey.pem

# Verify certificates exist
if [ ! -f privatekey.pem ] || [ ! -f server.crt ]; then
  echo "SSL certificate files could not be created."
  exit 1
fi

echo "SSL certificates created successfully."

# Start or restart the app with PM2
echo "Starting app with PM2..."
pm2 restart book_app || pm2 start server.js --name book_app
pm2 save

echo "Deployment complete."