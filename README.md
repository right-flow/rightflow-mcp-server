# RightFlow CoWork - Hebrew PDF MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![Test Coverage](https://img.shields.io/badge/coverage-90%25-brightgreen)](https://github.com/right-flow/rightflow-mcp-server)
[![Security: Comprehensive](https://img.shields.io/badge/security-comprehensive-green)](./SECURITY.md)

Open-source MCP (Model Context Protocol) server for generating professional Hebrew PDF documents via Claude Desktop with enterprise-grade security.

---

## ⚠️ LEGAL DISCLAIMER

> **IMPORTANT NOTICE**
>
> The templates provided by RightFlow CoWork are **for informational purposes only** and do **NOT constitute legal advice**.
>
> - Templates are provided "as-is" without warranty of legal validity
> - Templates are **community-contributed** and have **NOT received professional legal review**
> - Users are **solely responsible** for verifying document compliance with applicable laws
> - **Consult a qualified attorney** before using any legal document template
> - RightFlow and its contributors are **not liable** for any damages arising from template use
> - Templates may not reflect the most recent legal requirements
>
> **For legally binding documents, always consult with a licensed legal professional in your jurisdiction.**

---

## 🚀 Quick Start

### Installation

```bash
# Install globally
npm install -g @rightflow/mcp-server

# Or use with npx (no installation)
npx @rightflow/mcp-server
```

### Claude Desktop Setup

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "rightflow-cowork": {
      "command": "npx",
      "args": ["-y", "@rightflow/mcp-server"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Usage

In Claude Desktop, ask:

```
"Generate an employment contract for John Doe, Senior Developer, salary 25,000 ILS"
"Create a tax invoice for ABC Ltd, web development services, 15,000 ILS + VAT"
"Show me available PDF templates"
```

---

## ✨ Features

- ✅ **Hebrew/RTL Support** - Perfect rendering with proper BiDi handling
- ✅ **Community Templates** - 3-5 core templates (employment, invoice, receipt, NDA)
- ✅ **Enterprise Security** - 8-layer security architecture (path, memory, rate limits, PII)
- ✅ **Natural Language** - Generate PDFs by describing what you need
- ✅ **Local Processing** - Everything runs on your machine, privacy-first
- ✅ **Open Source** - MIT license, audit the code, contribute templates

---

## 🔐 Security Features

### 8-Layer Security Architecture

1. **Path Sanitizer** - Prevents path traversal attacks
2. **Rate Limiter** - DoS prevention (20 requests/min)
3. **Memory Manager** - Prevents OOM (100MB per document, 500MB total)
4. **Input Validator** - Zod schema validation
5. **Hebrew Sanitizer** - BiDi attack prevention (extended Unicode coverage)
6. **Template Verifier** - SHA-256 checksum verification
7. **PII Handler** - Secure handling, no logging of sensitive data
8. **Audit Logger** - Comprehensive logging (PII-safe)

**Test Coverage**: 90%+ overall, 95%+ for security components

See [SECURITY.md](./SECURITY.md) for full threat model and mitigation strategies.

---

## 📦 Available Templates

### Core Templates (Community-Contributed)

| Template | Hebrew Name | Category | Status |
|----------|-------------|----------|--------|
| Employment Contract | חוזה עבודה | Employment | ✅ Available |
| Tax Invoice | חשבונית מס | Finance | ✅ Available |
| Receipt | קבלה | Finance | ✅ Available |
| NDA | הסכם סודיות | Legal | 🔄 Coming Soon |

**Want more templates?** See [Contributing](#contributing) - community contributions welcome!

---

## 🏗️ Architecture

```
User Machine (Local Processing)
  ├─ Claude Desktop (MCP Protocol)
  │   └─ @rightflow/mcp-server
  │       ├─ Security Layer (8 layers)
  │       ├─ Validation Layer (BiDi, Israeli validators)
  │       ├─ Template System (checksum verified)
  │       ├─ PDF Engine (pdf-lib + Hebrew/RTL)
  │       └─ Storage & Audit (PII-safe)
  │
  └─ Templates (Community + Built-in)
      ├─ Built-in (verified checksums)
      ├─ Custom (user responsibility)
      └─ Community (peer-reviewed)
```

---

## 🧪 Development

### TDD Workflow

This project follows **strict Test-Driven Development** with QA agent validation:

```bash
# Install dependencies
npm install

# Run tests in watch mode (TDD)
npm run test:tdd

# Run QA Agent (after implementing)
npm run qa:stage2

# Security tests
npm run test:security

# Hebrew edge case tests
npm run test:hebrew

# Full build
npm run build
```

### Coverage Requirements

| Component | Minimum Coverage |
|-----------|-----------------|
| Security | 95% |
| Validators | 95% |
| PDF Engine | 90% |
| Templates | 90% |
| MCP Tools | 85% |

---

## 🤝 Contributing

We welcome community contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### How to Contribute Templates

1. Fork the repository
2. Create template with:
   - `template.pdf` (blank form)
   - `template.json` (field definitions)
   - `checksum.sha256` (integrity hash)
   - `README.md` (documentation)
3. Write tests first (TDD)
4. Run QA Agent (`npm run qa:stage6`)
5. Submit Pull Request

**Important**: All templates must include strong legal disclaimer and are peer-reviewed (not professionally reviewed).

---

## 📚 Documentation

- [Product Overview](./docs/01-Product-Overview.md)
- [Architecture Design](./docs/02-Architecture-Design.md)
- [Repository Structure](./docs/03-Repository-Structure-Guide.md)
- [TDD Development Stages](./docs/04-TDD-Development-Stages.md)
- [Security Specification](./docs/05-Security-Specification.md)

---

## 📝 License

MIT License - see [LICENSE](./LICENSE) for details.

---

## 🛡️ Security

Found a security vulnerability? See [SECURITY.md](./SECURITY.md) for responsible disclosure.

---

## 💬 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/right-flow/rightflow-mcp-server/issues)
- **GitHub Discussions**: [Ask questions](https://github.com/right-flow/rightflow-mcp-server/discussions)
- **Security**: See [SECURITY.md](./SECURITY.md)

---

## 🙏 Acknowledgments

- Built with [pdf-lib](https://pdf-lib.js.org/) and [MCP SDK](https://modelcontextprotocol.io/)
- Hebrew fonts: [Noto Sans Hebrew](https://fonts.google.com/noto/specimen/Noto+Sans+Hebrew) (SIL Open Font License)
- Inspired by the need for proper Hebrew/RTL document automation

---

**Maintained by**: RightFlow Community
**Repository**: https://github.com/right-flow/rightflow-mcp-server
**NPM Package**: [@rightflow/mcp-server](https://www.npmjs.com/package/@rightflow/mcp-server)
