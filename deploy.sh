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

# Ensure backend build directory exists
mkdir -p ../backend/build

# Copy frontend build to backend with verbose output
echo "Copying frontend build to backend..."
cp -rv build/* ../backend/build/

# Copy certificates to backend
echo "Copying SSL certificates to backend..."
cp ~/privatekey.pem ../backend/privatekey.pem
cp ~/server.crt ../backend/server.crt

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

# Verify certificates and build exist
if [ ! -f privatekey.pem ] || [ ! -f server.crt ]; then
   echo "SSL certificate files not found."
   exit 1
fi

if [ ! -d "build" ] || [ ! -f "build/index.html" ]; then
   echo "Frontend build not found in backend directory."
   exit 1
fi

echo "SSL certificates and frontend build verified successfully."

# Start or restart the app with PM2
echo "Starting app with PM2..."
pm2 restart book_app || pm2 start server.js --name book_app
pm2 save

echo "Deployment complete."
