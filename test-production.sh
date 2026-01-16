#!/bin/bash
#
# Production Build Test Script
# Tests the Railway production setup locally before deploying
#

set -e  # Exit on error

echo "============================================================"
echo "🧪 RightFlow Production Build Test"
echo "============================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Install dependencies
echo "📦 Step 1: Installing dependencies..."
echo "------------------------------------------------------------"
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi
echo ""

# Step 2: Build API (TypeScript → JavaScript)
echo "🔨 Step 2: Building API handlers..."
echo "------------------------------------------------------------"
npm run build:api
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ API built successfully${NC}"
    echo "   Output: dist-api/"
    ls -lh dist-api/*.js 2>/dev/null || echo "   (checking compiled files...)"
else
    echo -e "${RED}❌ API build failed${NC}"
    exit 1
fi
echo ""

# Step 3: Build Frontend (Vite)
echo "⚛️  Step 3: Building React frontend..."
echo "------------------------------------------------------------"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend built successfully${NC}"
    echo "   Output: dist/"
    du -sh dist/ 2>/dev/null || echo "   (checking build size...)"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi
echo ""

# Step 4: Verify builds
echo "🔍 Step 4: Verifying build outputs..."
echo "------------------------------------------------------------"
if [ -d "dist" ] && [ -d "dist-api" ]; then
    echo -e "${GREEN}✅ Both dist/ and dist-api/ directories exist${NC}"

    # Check for critical files
    if [ -f "dist/index.html" ]; then
        echo -e "${GREEN}✅ Frontend index.html found${NC}"
    else
        echo -e "${RED}❌ Missing dist/index.html${NC}"
        exit 1
    fi

    if [ -f "dist-api/forms.js" ]; then
        echo -e "${GREEN}✅ API handlers compiled (forms.js found)${NC}"
    else
        echo -e "${RED}❌ Missing dist-api/forms.js${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Build directories missing${NC}"
    exit 1
fi
echo ""

# Step 5: Check environment variables
echo "🔐 Step 5: Checking environment variables..."
echo "------------------------------------------------------------"
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file found${NC}"

    # Check critical env vars
    if grep -q "DATABASE_URL" .env; then
        echo -e "${GREEN}   ✓ DATABASE_URL configured${NC}"
    else
        echo -e "${YELLOW}   ⚠ DATABASE_URL missing in .env${NC}"
    fi

    if grep -q "VITE_CLERK_PUBLISHABLE_KEY" .env; then
        echo -e "${GREEN}   ✓ VITE_CLERK_PUBLISHABLE_KEY configured${NC}"
    else
        echo -e "${YELLOW}   ⚠ VITE_CLERK_PUBLISHABLE_KEY missing in .env${NC}"
    fi

    if grep -q "GEMINI_API_KEY" .env; then
        echo -e "${GREEN}   ✓ GEMINI_API_KEY configured${NC}"
    else
        echo -e "${YELLOW}   ⚠ GEMINI_API_KEY missing in .env${NC}"
    fi
else
    echo -e "${RED}❌ .env file not found${NC}"
    echo "   Copy .env.example to .env and configure it"
    exit 1
fi
echo ""

# Step 6: Start production server
echo "🚀 Step 6: Starting production server..."
echo "------------------------------------------------------------"
echo -e "${YELLOW}Starting server on http://localhost:3000${NC}"
echo ""
echo "The server will start in 3 seconds..."
echo "Press Ctrl+C to stop the server when you're done testing"
echo ""
sleep 3

NODE_ENV=production npm start
