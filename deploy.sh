#!/bin/bash

set -e

IMAGE_NAME="lisadavis552/bookmanagementapplication"
CONTAINER_NAME="node_app"
CERT_PATH="/home/ubuntu"
KEY_FILE="privatekey.pem"
CERT_FILE="server.crt"
SSL_KEY_CONTAINER_PATH="/app/backend/privatekey.pem"
SSL_CERT_CONTAINER_PATH="/app/backend/server.crt"

echo "Starting Docker-based deployment..."

# Stop and remove existing container
if docker ps -a --format '{{.Names}}' | grep -Eq "^$CONTAINER_NAME$"; then
  echo "Removing existing container: $CONTAINER_NAME"
  docker rm -f $CONTAINER_NAME
fi

# Build the Docker image
echo "Building Docker image: $IMAGE_NAME"
docker build -t $IMAGE_NAME .

# Write certs if provided in environment
if [[ -n "$PRIVATE_KEY" && -n "$SERVER" ]]; then
  printf "%b" "$PRIVATE_KEY" > $CERT_PATH/$KEY_FILE
  printf "%b" "$SERVER" > $CERT_PATH/$CERT_FILE
  chmod 644 $CERT_PATH/$KEY_FILE $CERT_PATH/$CERT_FILE
fi

# Run the container
echo "Running container: $CONTAINER_NAME"
docker run -d \
  --name $CONTAINER_NAME \
  -p 8443:8443 \
  -v $CERT_PATH/$KEY_FILE:$SSL_KEY_CONTAINER_PATH \
  -v $CERT_PATH/$CERT_FILE:$SSL_CERT_CONTAINER_PATH \
  -e SSL_KEY_PATH=$SSL_KEY_CONTAINER_PATH \
  -e SSL_CERT_PATH=$SSL_CERT_CONTAINER_PATH \
  --restart always \
  $IMAGE_NAME

echo "Deployment complete."