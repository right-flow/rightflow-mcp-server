# Quick Start Installation Guide

## Prerequisites

1. **RightFlow Backend** running on `http://localhost:3003`
2. **Node.js** >= 18.0.0 installed
3. **RightFlow API Key** (get from backend admin)

## Installation Steps

### Step 1: Build the MCP Server

```bash
cd packages/mcp-server
npm install
npm run build
```

### Step 2: Get Absolute Path

```bash
# Get the full path to the built server
pwd
# Example output: C:\Dev\Dev\RightFlow\packages\mcp-server
```

### Step 3: Configure Claude Code

1. **Open Claude Code configuration**:
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Mac/Linux: `~/.claude/claude_desktop_config.json`

2. **Add the RightFlow MCP server**:

```json
{
  "mcpServers": {
    "rightflow": {
      "command": "node",
      "args": [
        "C:\Dev\Dev\RightFlow\packages\mcp-server\dist\index.js"
      ],
      "env": {
        "RIGHTFLOW_API_URL": "http://localhost:3003/api/v1",
        "RIGHTFLOW_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

**Important**: 
- Replace `C:\Dev\Dev\RightFlow` with YOUR actual path from Step 2
- Replace `your_api_key_here` with your actual API key
- Use **double backslashes** (`\`) on Windows

### Step 4: Get Your API Key

Option 1: Create via backend API:
```bash
curl -X POST http://localhost:3003/api/v1/auth/api-key \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -H "Content-Type: application/json"
```

Option 2: Generate manually in RightFlow admin dashboard (if available)

### Step 5: Restart Claude Code

Close Claude Code completely and reopen it.

### Step 6: Test the Connection

In Claude Code, try:
```
"List available Hebrew PDF templates"
```

Claude should use the `list_templates` tool from RightFlow MCP server.

## Verification

Check if the server is working:

1. **See available tools** in Claude Code:
   - `list_templates`
   - `get_template_fields`
   - `fill_pdf`
   - `list_categories`

2. **Test a simple query**:
   ```
   "What templates are available in the legal category?"
   ```

3. **Generate a test PDF**:
   ```
   "Create an employment contract PDF for test user"
   ```

## Troubleshooting

### Server Not Loading

1. **Check configuration file**:
   - File exists at correct location
   - JSON is valid (no syntax errors)
   - Path to `dist/index.js` is absolute

2. **Check Claude Code logs**:
   - Windows: `%APPDATA%\Claude\logs`
   - Mac: `~/Library/Logs/Claude`

### "API Key Required" Error

1. Make sure `RIGHTFLOW_API_KEY` is set in the configuration
2. Verify the API key is valid
3. Test the API key with curl:
   ```bash
   curl http://localhost:3003/api/v1/mcp/templates \
     -H "Authorization: Bearer your_api_key_here"
   ```

### "Cannot Connect to API" Error

1. Verify backend is running:
   ```bash
   curl http://localhost:3003/api/v1/health
   ```

2. Check the port matches your backend configuration

3. Ensure `RIGHTFLOW_API_URL` is correct in the MCP config

### Server Logs

To see what's happening, check stderr output in Claude Code logs. The server logs:
- API URL being used
- API key (last 4 characters only)
- Any connection errors

## Alternative: GitHub Installation (Future)

Once published, you can install directly from GitHub:

1. In Claude Code, go to "Browse plugins"
2. Click "Add from GitHub"
3. Enter: `https://github.com/your-org/rightflow-mcp-server.git`

This method auto-updates and is easier to manage.

## Next Steps

After successful installation:

1. **Explore templates**: Ask Claude "What PDF templates are available?"
2. **Check fields**: Ask "What fields does the employment contract need?"
3. **Generate PDFs**: Ask Claude to fill a template with sample data
4. **Read documentation**: Check `README.md` for full feature list

## Example Workflows

### Workflow 1: Discover Templates

```
User: "What Hebrew PDF templates are available for HR documents?"
Claude: Uses list_templates(category: "hr", language: "he")
Claude: Shows employment contracts, leave requests, etc.
```

### Workflow 2: Fill Employment Contract

```
User: "Create an employment contract for משה כהן, ID 123456789, starting 2024-03-01"
Claude: Uses get_template_fields() to understand required fields
Claude: Uses fill_pdf() with provided data
Claude: Returns download link to generated PDF
```

### Workflow 3: Batch Generation

```
User: "Generate 5 rental contracts for different tenants"
Claude: Asks for tenant details
User: Provides data
Claude: Loops through fill_pdf() for each tenant
Claude: Returns 5 download links
```

## Support

For issues:
1. Check this guide's troubleshooting section
2. Review `README.md` for detailed documentation
3. Check GitHub issues (when published)
4. Contact RightFlow support
