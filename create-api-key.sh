#!/bin/bash

# Script to create MCP API Key
# Usage: ./create-api-key.sh <CLERK_TOKEN>

CLERK_TOKEN=$1

if [ -z "$CLERK_TOKEN" ]; then
  echo "Usage: ./create-api-key.sh <CLERK_TOKEN>"
  echo ""
  echo "Get your Clerk token from:"
  echo "1. Open browser DevTools (F12)"
  echo "2. Go to Application/Storage > Cookies"
  echo "3. Copy the value of '__session' cookie"
  exit 1
fi

echo "Creating API key..."
echo ""

response=$(curl -s -X POST http://localhost:3003/api/v1/api-keys \
  -H "Authorization: Bearer $CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MCP Server Test Key",
    "description": "API key for testing Claude Code MCP connector",
    "environment": "development"
  }')

echo "$response" | jq '.'

# Extract API key
api_key=$(echo "$response" | jq -r '.data.api_key')

if [ "$api_key" != "null" ] && [ ! -z "$api_key" ]; then
  echo ""
  echo "=========================================="
  echo "✅ API KEY CREATED SUCCESSFULLY!"
  echo "=========================================="
  echo "API Key: $api_key"
  echo "=========================================="
  echo "⚠️  SAVE THIS KEY - IT WON'T BE SHOWN AGAIN!"
  echo "=========================================="
  echo ""
  echo "Next steps:"
  echo "1. Copy the API key above"
  echo "2. Add it to your Claude Code config:"
  echo "   %APPDATA%\Claude\claude_desktop_config.json"
  echo "3. Restart Claude Code"
else
  echo ""
  echo "❌ Failed to create API key"
  echo "Response: $response"
fi
