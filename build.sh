#!/bin/bash

# Pushnami Project Build Script
# This script installs dependencies and builds all Docker containers

set -e  # Exit on error

echo "🚀 Building Pushnami Landing Page Tracking System"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Install API service dependencies
echo -e "${BLUE}Step 1/3:${NC} Installing API service dependencies..."
cd services/api-service
npm install
cd ../..
echo -e "${GREEN}✓${NC} Dependencies installed"
echo ""

# Step 2: Clean up old containers
echo -e "${BLUE}Step 2/3:${NC} Cleaning up old containers..."
docker compose down -v
echo -e "${GREEN}✓${NC} Cleanup complete"
echo ""

# Step 3: Build and start all services
echo -e "${BLUE}Step 3/3:${NC} Building and starting all services..."
docker compose up --build -d
echo ""

# Wait for services to be healthy
echo "⏳ Waiting for services to become healthy..."
sleep 5

# Check health
echo ""
echo "🏥 Checking service health..."
curl -s http://localhost:4000/health | python3 -m json.tool 2>/dev/null || echo "API service starting up..."

echo ""
echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo "Services available at:"
echo "  • Landing Page:    http://localhost:3000"
echo "  • Admin Dashboard: http://localhost:3001"
echo "  • API Health:      http://localhost:4000/health"
echo ""
echo "View logs with: docker compose logs -f"
echo "Stop services with: docker compose down"
