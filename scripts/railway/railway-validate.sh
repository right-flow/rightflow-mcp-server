#!/bin/bash

# Railway Validate Script
# Builds and tests the Docker image locally to simulate Railway environment
# Duration: ~3-5 minutes

set -e

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

echo ""
echo "🚂 Railway Local Validation"
echo "═══════════════════════════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CONTAINER_NAME="rightflow-railway-test"
IMAGE_NAME="rightflow-local"

# Cleanup function
cleanup() {
  echo -e "\n${BLUE}Cleaning up...${NC}"
  docker stop $CONTAINER_NAME 2>/dev/null || true
  docker rm $CONTAINER_NAME 2>/dev/null || true
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Step 1: Build Docker image
echo -e "${YELLOW}Step 1: Building Docker image (this mirrors Railway build)${NC}"
echo "─────────────────────────────────────────────────────────"

docker build \
  --build-arg VITE_CLERK_PUBLISHABLE_KEY="${VITE_CLERK_PUBLISHABLE_KEY:-pk_test_placeholder}" \
  --build-arg VITE_API_BASE_URL="http://localhost:3000/api" \
  --build-arg CACHE_BUST="local-$(date +%Y%m%d-%H%M%S)" \
  -f packages/app/Dockerfile \
  -t $IMAGE_NAME \
  .

if [ $? -ne 0 ]; then
  echo -e "\n${RED}❌ Docker build FAILED${NC}"
  echo "This is the same error you would see on Railway."
  exit 1
fi

echo -e "\n${GREEN}✓ Docker build successful${NC}"

# Step 2: Start container
echo -e "\n${YELLOW}Step 2: Starting container${NC}"
echo "─────────────────────────────────────────────────────────"

# Stop any existing container
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

docker run -d \
  --name $CONTAINER_NAME \
  -p 3000:3000 \
  -e PORT=3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="${DATABASE_URL:-postgresql://localhost:5432/rightflow}" \
  -e REDIS_URL="${REDIS_URL:-redis://localhost:6379}" \
  $IMAGE_NAME

echo "Waiting for container to start..."
sleep 5

# Check if container is running
if ! docker ps | grep -q $CONTAINER_NAME; then
  echo -e "\n${RED}❌ Container failed to start${NC}"
  echo "Container logs:"
  docker logs $CONTAINER_NAME
  exit 1
fi

echo -e "${GREEN}✓ Container started${NC}"

# Step 3: Health checks
echo -e "\n${YELLOW}Step 3: Running health checks${NC}"
echo "─────────────────────────────────────────────────────────"

HEALTH_ENDPOINTS=(
  "http://localhost:3000/health"
  "http://localhost:3000/api/health"
)

ALL_HEALTHY=true

for endpoint in "${HEALTH_ENDPOINTS[@]}"; do
  echo -n "Checking $endpoint... "

  # Try up to 3 times with 2 second delay
  for i in 1 2 3; do
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" 2>/dev/null || echo "000")

    if [ "$RESPONSE" = "200" ]; then
      echo -e "${GREEN}OK${NC}"
      break
    fi

    if [ $i -lt 3 ]; then
      sleep 2
    fi
  done

  if [ "$RESPONSE" != "200" ]; then
    echo -e "${RED}FAILED (HTTP $RESPONSE)${NC}"
    ALL_HEALTHY=false
  fi
done

# Step 4: Show container logs
echo -e "\n${YELLOW}Step 4: Container logs (last 20 lines)${NC}"
echo "─────────────────────────────────────────────────────────"
docker logs --tail 20 $CONTAINER_NAME

# Step 5: Summary
echo -e "\n═══════════════════════════════════════════════════════"

if [ "$ALL_HEALTHY" = true ]; then
  echo -e "${GREEN}✅ Railway validation PASSED${NC}"
  echo ""
  echo "The application built and started successfully."
  echo "You can now deploy to Railway with confidence."
  echo ""
  echo "To deploy:"
  echo "  npm run railway:deploy"
  echo ""
else
  echo -e "${RED}❌ Railway validation FAILED${NC}"
  echo ""
  echo "Some health checks failed. Check the logs above."
  echo "Fix issues before deploying to Railway."
  echo ""
  exit 1
fi