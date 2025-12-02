#!/bin/bash
set -e

# Wait for MinIO to be ready
until nc -z localhost 9000; do
  echo "Waiting for MinIO..."
  sleep 1
done

# Configure mc client
/usr/bin/mc alias set myminio http://localhost:9000 admin admin123

# Create bucket if it doesn't exist
/usr/bin/mc mb myminio/warpstream --ignore-existing

echo "MinIO bucket created successfully"
