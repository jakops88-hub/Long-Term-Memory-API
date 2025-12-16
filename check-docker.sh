#!/bin/bash

echo "Checking Docker installation..."
echo ""

echo "Docker version:"
docker --version
echo ""

echo "Docker daemon status:"
docker ps
echo ""

if [ $? -eq 0 ]; then
  echo "Docker is configured correctly and running."
else
  echo "Docker check failed. Please verify the setup."
  exit 1
fi
