#!/bin/bash

echo "Starting Docker-based deployment..."

# Stop and remove any existing container from the same image
CURRENT_INSTANCE=$(docker ps -a -q --filter ancestor="$IMAGE_NAME" --format="{{.ID}}")
if [ "$CURRENT_INSTANCE" ]; then
  echo "Stopping and removing existing container using image: $IMAGE_NAME"
  docker rm $(docker stop $CURRENT_INSTANCE)
fi

# Remove container with name node_app if it exists
CONTAINER_EXISTS=$(docker ps -a | grep $CONTAINER_NAME)
if [ "$CONTAINER_EXISTS" ]; then
  echo "Removing old container named $CONTAINER_NAME"
  docker rm $CONTAINER_NAME
fi

# Pull the latest image
echo "Pulling image: $IMAGE_NAME"
docker pull $IMAGE_NAME

# Create the container (but don't start yet)
echo "Creating container..."
docker create -p 8443:8443 --name $CONTAINER_NAME $IMAGE_NAME

# Write certs from environment to files
echo "$PRIVATE_KEY" > privatekey.pem
echo "$SERVER" > server.crt

# Copy certs into the container
docker cp privatekey.pem $CONTAINER_NAME:/app/backend/privatekey.pem
docker cp server.crt $CONTAINER_NAME:/app/backend/server.crt

# Start the container
echo "Starting container..."
docker start $CONTAINER_NAME

echo "Deployment complete."
