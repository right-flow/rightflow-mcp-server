# RightFlow MCP Server - Hebrew PDF Generation for Claude Code

Model Context Protocol (MCP) server that brings Hebrew PDF generation capabilities to Claude Code and Claude Cowork.

## Features

- **4 Tools** for Claude to call:
  - `list_templates` - Browse available Hebrew PDF templates
  - `get_template_fields` - Get field definitions for a template
  - `fill_pdf` - Generate filled PDFs with Hebrew text (RTL support)
  - `list_categories` - View template categories

- **2 Resources** for Claude to read:
  - `rightflow://templates` - All available templates
  - `rightflow://categories` - Template categories with descriptions

- **Proper Hebrew Support**:
  - Right-to-left (RTL) text rendering
  - Hebrew font embedding with full character sets
  - BiDi (Bidirectional) text handling
  - Mixed Hebrew/English content support

## Prerequisites

- Node.js >= 18.0.0
- Running RightFlow backend server on `http://localhost:3003`
- RightFlow API key

## Installation

### Option 1: Install from GitHub (Recommended)

```bash
# In Claude Code, use "Add from GitHub"
# Paste this repository URL:
https://github.com/your-org/rightflow-mcp-server.git
```

### Option 2: Install from Local Development

```bash
cd packages/mcp-server

# Install dependencies
npm install

# Build the server
npm run build

# Link globally for local testing
npm link
```

## Configuration

### Step 1: Create Environment File

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
RIGHTFLOW_API_URL=http://localhost:3003/api/v1
RIGHTFLOW_API_KEY=your_api_key_here
```

### Step 2: Configure Claude Code

Add the server to your Claude Code configuration file:

**Location**: `~/.claude/claude_desktop_config.json` (or `%APPDATA%\Claude\claude_desktop_config.json` on Windows)

```json
{
  "mcpServers": {
    "rightflow": {
      "command": "node",
      "args": [
        "/absolute/path/to/rightflow-mcp-server/dist/index.js"
      ],
      "env": {
        "RIGHTFLOW_API_URL": "http://localhost:3003/api/v1",
        "RIGHTFLOW_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

**Important**: Replace `/absolute/path/to/` with the actual path to this package.

### Step 3: Restart Claude Code

Close and reopen Claude Code to load the MCP server.

## Usage Examples

Once configured, Claude can use these tools naturally in conversation:

### List Available Templates

```
User: "What Hebrew PDF templates are available for employment contracts?"

Claude uses: list_templates(category: "hr", language: "he")
```

### Get Template Fields

```
User: "What information do I need to fill an employment contract?"

Claude uses: get_template_fields(template_id: "employment-contract-il")
```

### Generate PDF

```
User: "Create an employment contract for משה כהן, ID 123456789, starting January 1, 2024"

Claude uses: fill_pdf(
  template_id: "employment-contract-il",
  data: {
    "employee_name": "משה כהן",
    "employee_id": "123456789",
    "start_date": "2024-01-01",
    ...
  },
  language: "he"
)
```

## Development

### Build

```bash
npm run build
```

### Watch Mode (for development)

```bash
npm run dev
```

### Test the Server

```bash
# Start the server manually (for debugging)
npm start
```

The server communicates via stdio (standard input/output) following the MCP protocol.

## Troubleshooting

### Error: "RIGHTFLOW_API_KEY environment variable is required"

Make sure you've set the API key in:
1. `.env` file, OR
2. Claude Code configuration (`claude_desktop_config.json`)

### Error: "Cannot connect to RightFlow API"

1. Verify the backend is running: `curl http://localhost:3003/api/v1/health`
2. Check the API URL in your configuration
3. Ensure the port (3003) matches your backend configuration

### Server Not Appearing in Claude Code

1. Check the configuration file path is correct
2. Verify the `dist/index.js` path is absolute, not relative
3. Restart Claude Code completely
4. Check Claude Code logs for errors

## Use Cases

### Legal Documents
- Employment contracts (חוזה עבודה)
- Rental agreements (הסכם שכירות)
- Service agreements (הסכם שירות)

### Accounting Documents
- Invoices (חשבונית)
- Receipts (קבלה)
- Tax forms (טופס מס)

### HR Documents  
- Employee onboarding forms
- Leave requests (בקשת חופשה)
- Performance reviews

### Real Estate
- Rental contracts (חוזה שכירות)
- Property listings (מודעת נדל"ן)
- Purchase agreements (הסכם רכישה)

## Architecture

```
┌─────────────────┐
│  Claude Code    │
│  (User Chat)    │
└────────┬────────┘
         │ MCP Protocol (stdio)
         ↓
┌─────────────────┐
│ RightFlow MCP   │
│    Server       │
│  (This Package) │
└────────┬────────┘
         │ REST API (HTTP)
         ↓
┌─────────────────┐
│  RightFlow API  │
│   (Backend)     │
│  localhost:3003 │
└─────────────────┘
```

## API Reference

### Tools

#### `list_templates`

List available templates with optional filtering.

**Parameters:**
- `category` (optional): `"legal" | "accounting" | "hr" | "real_estate" | "general"`
- `search` (optional): Search query string
- `language` (optional): `"he" | "en"` (default: `"he"`)

**Returns:** Array of templates with metadata

#### `get_template_fields`

Get field definitions for a specific template.

**Parameters:**
- `template_id` (required): Template UUID
- `language` (optional): `"he" | "en"` (default: `"he"`)

**Returns:** Array of field definitions with validation rules

#### `fill_pdf`

Generate a filled PDF from a template.

**Parameters:**
- `template_id` (required): Template UUID
- `data` (required): Object with field values
- `file_name` (optional): Output filename
- `language` (optional): `"he" | "en"` (default: `"he"`)

**Returns:** Generated PDF file URL, file size, and metadata

#### `list_categories`

List all template categories.

**Returns:** Array of categories with counts

### Resources

#### `rightflow://templates`

Read-only resource containing all available templates.

#### `rightflow://categories`

Read-only resource containing template categories.

## Security

- API key required for authentication
- All requests authenticated via Bearer token
- Multi-tenant data isolation (organization-based)
- Local file storage with organization-scoped paths
- Input validation and sanitization
- BiDi attack prevention (Unicode control character filtering)

## License

MIT

## Support

For issues, questions, or contributions:
- GitHub Issues: https://github.com/your-org/rightflow-mcp-server/issues
- Documentation: https://rightflow.io/docs

## Related Projects

- [RightFlow Backend](../app/backend) - Main RightFlow API server
- [pdf-lib](https://pdf-lib.js.org/) - PDF manipulation library
- [Model Context Protocol](https://modelcontextprotocol.io) - MCP specification
