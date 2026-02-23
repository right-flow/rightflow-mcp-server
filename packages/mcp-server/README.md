# RightFlow MCP Server

**Hebrew PDF Generation for Claude Desktop**

[![Tests](https://img.shields.io/badge/tests-122%20passing-brightgreen)](./TESTING.md)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

A Model Context Protocol (MCP) server that brings professional Hebrew PDF generation capabilities to Claude Desktop. Connect Claude to RightFlow's powerful Hebrew PDF API with proper RTL support, Hebrew font embedding, and BiDi text handling.

---

## ✨ Features

### 🛠️ 4 MCP Tools

| Tool | Description | Use Case |
|------|-------------|----------|
| **`list_templates`** | Browse available PDF templates | "Show me all employment contract templates" |
| **`get_template_fields`** | Get field definitions for a template | "What fields does the tax invoice template have?" |
| **`fill_pdf`** | Generate filled PDFs with Hebrew text | "Create an employment contract for Yossi Cohen" |
| **`list_categories`** | View template categories with counts | "What types of templates are available?" |

### 📚 2 MCP Resources

| Resource | Description |
|----------|-------------|
| **`rightflow://templates`** | Access all available templates |
| **`rightflow://categories`** | Browse template categories |

### 🌐 Perfect Hebrew Support

- ✅ **Right-to-Left (RTL)** text rendering
- ✅ **Hebrew font embedding** with full character sets
- ✅ **BiDi (Bidirectional)** text handling
- ✅ **Mixed Hebrew/English** content support
- ✅ **Hebrew with nikud** (vowel marks): יוֹסֵף
- ✅ **Hebrew punctuation**: "שאלה?"

### 🔒 Enterprise-Grade Security

- ✅ **API Key Authentication** - Secure Bearer token validation
- ✅ **Input Sanitization** - XSS, SQL injection, path traversal prevention
- ✅ **Rate Limiting** - Configurable request limits
- ✅ **Error Handling** - Graceful timeout and network error handling

### ✅ Comprehensive Testing

- **122 tests passing** (90 unit + 32 integration)
- **Hebrew/RTL test coverage** - Special tests for Hebrew text edge cases
- **Security test coverage** - Authentication, validation, error handling
- **Integration tests** - Real HTTP calls with mock backend

---

## 📋 Prerequisites

Before installing, ensure you have:

- **Node.js** >= 18.0.0 ([Download](https://nodejs.org))
- **RightFlow Backend** running on `http://localhost:3003`
- **RightFlow API Key** (generate from your dashboard)
- **Claude Desktop** installed ([Download](https://claude.ai/download))

---

## 🚀 Installation

### Option 1: NPM Package (Coming Soon)

```bash
npm install -g @rightflow/mcp-hebrew-pdf
```

### Option 2: From Source (Development)

```bash
# Clone the repository
git clone https://github.com/your-org/rightflow.git
cd rightflow/packages/mcp-server

# Install dependencies
npm install

# Build the server
npm run build

# Test installation
npm test
```

---

## ⚙️ Configuration

### Step 1: Create Environment File

Create a `.env` file in the `mcp-server` directory:

```bash
# Copy example environment file
cp .env.example .env
```

Edit `.env` with your settings:

```env
# RightFlow API Configuration
RIGHTFLOW_API_URL=http://localhost:3003/api/v1
RIGHTFLOW_API_KEY=your_api_key_here
```

### Step 2: Configure Claude Desktop

Add the server to your Claude Desktop configuration file:

**Location:**
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

**Configuration:**

```json
{
  "mcpServers": {
    "rightflow-hebrew-pdf": {
      "command": "node",
      "args": [
        "/absolute/path/to/rightflow/packages/mcp-server/dist/index.js"
      ],
      "env": {
        "RIGHTFLOW_API_URL": "http://localhost:3003/api/v1",
        "RIGHTFLOW_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

**Important:** Replace `/absolute/path/to/` with the actual path to your installation.

### Step 3: Restart Claude Desktop

Close and reopen Claude Desktop to load the MCP server.

---

## 💡 Usage Examples

### Example 1: List Available Templates

**You:**
> "What PDF templates are available?"

**Claude:**
> I can see 15 templates across 5 categories:
>
> **HR & Employment (5 templates):**
> - Employment Contract (חוזה עבודה)
> - NDA (הסכם סודיות)
> - Termination Letter (מכתב פיטורים)
> - Salary Certificate (אישור שכר)
> - Hourly Employment (חוזה עבודה שעתי)
>
> **Accounting (4 templates):**
> - Tax Invoice (חשבונית מס)
> - Receipt (קבלה)
> - Donation Receipt (קבלה לתרומה)
> - Expense Report (דוח הוצאות)
>
> [...]

---

### Example 2: Generate Employment Contract

**You:**
> "Create an employment contract for Yossi Cohen, Senior Developer, salary 25,000 ₪, starting March 1st, 2024"

**Claude:**
> I'll create an employment contract with those details.
>
> [Calls `fill_pdf` tool with Hebrew data]
>
> ✅ Employment contract generated successfully!
> - **File:** employment-contract-yossi-cohen.pdf
> - **Template:** Employment Contract Standard
> - **Fields filled:** 11
> - **Language:** Hebrew (עברית)
>
> The PDF includes:
> - Employee: יוסי כהן
> - Position: מפתח סניור
> - Salary: 25,000 ₪
> - Start date: 01/03/2024
> - Standard employment terms and clauses

---

### Example 3: Get Template Fields

**You:**
> "What fields do I need to fill for a tax invoice?"

**Claude:**
> The Tax Invoice template requires these fields:
>
> **Required Fields:**
> - Invoice Number (מספר חשבונית) - text
> - Invoice Date (תאריך חשבונית) - date (YYYY-MM-DD)
> - Customer Name (שם לקוח) - text
> - Customer ID (ת.ז. לקוח) - text (9 digits)
> - Amount (סכום) - number
> - VAT Rate (מע"מ) - number (default: 17%)
>
> **Optional Fields:**
> - Notes (הערות) - textarea
> - Payment Terms (תנאי תשלום) - text

---

## 📖 API Reference

### Tool: `list_templates`

**Description:** List available PDF templates with optional filtering.

**Input Schema:**
```typescript
{
  category?: 'legal' | 'accounting' | 'hr' | 'real_estate' | 'general';
  search?: string;
  language?: 'he' | 'en';
}
```

**Output:**
```typescript
{
  templates: Array<{
    id: string;
    name: string;
    name_he: string;
    category: string;
    description: string;
    description_he: string;
  }>;
  total: number;
}
```

---

### Tool: `get_template_fields`

**Description:** Get field definitions for a specific template.

**Input Schema:**
```typescript
{
  template_id: string;  // Required
  language?: 'he' | 'en';
}
```

**Output:**
```typescript
{
  id: string;
  name: string;
  name_he: string;
  category: string;
  fields: Array<{
    id: string;
    name: string;
    name_he: string;
    type: 'text' | 'number' | 'date' | 'textarea';
    required: boolean;
    validation?: {
      pattern?: string;
      min?: number;
      max?: number;
      validator?: string;
    };
  }>;
}
```

---

### Tool: `fill_pdf`

**Description:** Generate a filled PDF from a template with Hebrew text support.

**Input Schema:**
```typescript
{
  template_id: string;  // Required
  data: Record<string, string | number>;  // Required
  file_name?: string;
  language?: 'he' | 'en';
}
```

**Output:**
```typescript
{
  success: boolean;
  pdf: string;  // Base64-encoded PDF
  fileName: string;
  metadata: {
    templateId: string;
    fieldsFilled: number;
    errors: string[];
    generatedAt: string;
  };
}
```

---

### Tool: `list_categories`

**Description:** List all template categories with template counts.

**Input Schema:**
```typescript
{
  // No parameters
}
```

**Output:**
```typescript
{
  categories: Array<{
    id: string;
    name: string;
    name_he: string;
    description: string;
    description_he: string;
    count: number;
  }>;
  total: number;
}
```

---

## 🧪 Testing

The MCP server includes comprehensive test coverage:

```bash
# Run all tests (122 tests)
npm test

# Run unit tests only (90 tests)
npm run test:unit

# Run integration tests only (32 tests)
npm run test:integration

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

**Test Coverage:**
- ✅ **90 unit tests** - Tool behavior validation
- ✅ **32 integration tests** - Real HTTP communication
- ✅ **Hebrew/RTL tests** - Special Hebrew text edge cases
- ✅ **Security tests** - Authentication, validation, error handling

See [TESTING.md](./TESTING.md) for detailed test documentation.

---

## 🐛 Troubleshooting

### Server Not Connecting

**Symptom:** Claude Desktop can't connect to the MCP server.

**Solutions:**
1. Check that the backend server is running on `http://localhost:3003`
2. Verify your API key is correct in `.env` and `claude_desktop_config.json`
3. Check the absolute path in `claude_desktop_config.json` is correct
4. Restart Claude Desktop after configuration changes

---

### API Key Invalid

**Symptom:** Getting 401 Unauthorized errors.

**Solutions:**
1. Generate a new API key from your RightFlow dashboard
2. Update the `RIGHTFLOW_API_KEY` in both `.env` and Claude config
3. Ensure the API key starts with `Bearer ` prefix in requests

---

### Hebrew Text Not Rendering

**Symptom:** Hebrew text appears reversed or garbled.

**Solutions:**
1. Verify the backend server supports Hebrew fonts
2. Check that `language: 'he'` is set in tool calls
3. Ensure Hebrew text is provided in logical order (not reversed)
4. The backend handles RTL rendering automatically

---

### Template Not Found

**Symptom:** Getting 404 errors when trying to use a template.

**Solutions:**
1. Use `list_templates` to see available templates
2. Verify the `template_id` matches exactly (case-sensitive)
3. Check that the template exists in your organization

---

## 🔧 Development

### Building from Source

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode (auto-rebuild on changes)
npm run dev

# Type check without building
npm run typecheck
```

### Project Structure

```
packages/mcp-server/
├── src/
│   ├── index.ts              # Main MCP server entry point
│   ├── types/                # TypeScript type definitions
│   └── validators/           # Input validation utilities
├── tests/
│   ├── setup.ts              # Global test setup
│   ├── unit/                 # Unit tests (90 tests)
│   └── integration/          # Integration tests (32 tests)
├── dist/                     # Compiled JavaScript output
├── .env.example              # Example environment variables
├── package.json              # NPM package configuration
├── tsconfig.json             # TypeScript configuration
├── vitest.config.ts          # Test configuration
└── README.md                 # This file
```

---

## 📝 License

MIT License - see [LICENSE](./LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Write tests** for your changes (maintain 90%+ coverage)
4. **Run tests** (`npm test`)
5. **Commit your changes** (`git commit -m 'Add amazing feature'`)
6. **Push to the branch** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**

---

## 🔗 Related Resources

- **RightFlow Backend**: [packages/app/backend](../../app/backend)
- **MCP Protocol**: https://modelcontextprotocol.io
- **Claude Desktop**: https://claude.ai/download
- **API Documentation**: [API_REFERENCE.md](./API_REFERENCE.md)
- **Testing Guide**: [TESTING.md](./TESTING.md)

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/rightflow/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/rightflow/discussions)
- **Email**: support@rightflow.com

---

## 🎯 Roadmap

### v1.0 (Current)
- ✅ 4 MCP Tools (list, get, fill, categories)
- ✅ Hebrew/RTL support
- ✅ API Key authentication
- ✅ Comprehensive testing (122 tests)

### v1.1 (Planned)
- [ ] Batch PDF generation
- [ ] Template preview
- [ ] Custom template upload
- [ ] Enhanced error messages

### v2.0 (Future)
- [ ] E2E MCP protocol tests
- [ ] Performance optimizations
- [ ] Template marketplace
- [ ] Advanced Hebrew features (dates, numbers)

---

**Made with ❤️ by the RightFlow Team**
