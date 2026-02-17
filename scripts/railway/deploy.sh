#!/bin/bash

# Railway Deploy Script
# Automatically updates cache bust and deploys to Railway

set -e

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

echo ""
echo "🚂 Railway Deploy"
echo "═══════════════════════════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Run pre-deploy check
echo -e "${YELLOW}Step 1: Running pre-deploy checks${NC}"
echo "─────────────────────────────────────────────────────────"

node scripts/railway/railway-check.js

if [ $? -ne 0 ]; then
  echo -e "\n${RED}❌ Pre-deploy check failed. Fix errors before deploying.${NC}"
  exit 1
fi

# Step 2: Update cache bust timestamp
echo -e "\n${YELLOW}Step 2: Updating cache bust timestamp${NC}"
echo "─────────────────────────────────────────────────────────"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Update railway.json
if [ -f "railway.json" ]; then
  # Use node for cross-platform JSON editing
  node -e "
    const fs = require('fs');
    const config = JSON.parse(fs.readFileSync('railway.json', 'utf8'));
    config.build = config.build || {};
    config.build.buildArgs = config.build.buildArgs || {};
    config.build.buildArgs.FORCE_REBUILD = '$TIMESTAMP';
    fs.writeFileSync('railway.json', JSON.stringify(config, null, 2) + '\n');
    console.log('Updated railway.json FORCE_REBUILD to $TIMESTAMP');
  "
fi

# Update .build-timestamp
echo "$TIMESTAMP" > packages/app/.build-timestamp
echo "Updated packages/app/.build-timestamp"

# Step 3: Git commit and push
echo -e "\n${YELLOW}Step 3: Committing and pushing${NC}"
echo "─────────────────────────────────────────────────────────"

git add railway.json packages/app/.build-timestamp

# Check if there are changes to commit
if git diff --cached --quiet; then
  echo "No changes to commit (cache bust files unchanged)"
else
  git commit -m "chore: Deploy update $TIMESTAMP

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
fi

echo -e "\n${BLUE}Pushing to remote...${NC}"
git push

echo -e "\n${GREEN}✅ Deploy triggered!${NC}"
echo ""
echo "Railway will now build and deploy your application."
echo ""
echo "Monitor the build at:"
echo "  https://railway.app/dashboard"
echo ""
echo "Or run:"
echo "  railway logs --follow"
echo ""