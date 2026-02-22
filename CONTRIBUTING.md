# Contributing to RightFlow CoWork

Thank you for your interest in contributing! This project follows strict **Test-Driven Development (TDD)** methodology.

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- Git
- Basic understanding of TypeScript and TDD

### Setup

```bash
# Fork and clone the repository
git clone https://github.com/right-flow/rightflow-mcp-server.git
cd rightflow-mcp-server

# Install dependencies
npm install

# Run tests in watch mode
npm run test:watch

# Run QA Agent
npm run qa:stage2
```

---

## 🧪 TDD Workflow

**CRITICAL**: Always write tests BEFORE implementation.

### 1. RED - Write Failing Test

```typescript
// tests/unit/security/my-feature.test.ts
import { describe, it, expect } from "vitest";
import { myFeature } from "../../../src/security/my-feature.js";

describe("MyFeature", () => {
  it("should do X when Y", () => {
    const result = myFeature(input);
    expect(result).toBe(expectedOutput);
  });
});
```

Run: `npm test` - Expected: ❌ Test fails

### 2. GREEN - Minimal Implementation

```typescript
// src/security/my-feature.ts
export function myFeature(input: string): string {
  return expectedOutput; // Minimal code to pass test
}
```

Run: `npm test` - Expected: ✅ Test passes

### 3. REFACTOR - Improve Code

```typescript
// src/security/my-feature.ts
export function myFeature(input: string): string {
  // Proper implementation
  return processInput(input);
}
```

Run: `npm test` - Expected: ✅ Still passes

### 4. QA AGENT - Validate

```bash
npm run qa:stage2
```

Expected: ✅ All checks pass

---

## 📝 Code Style

### TypeScript

- Use strict mode
- No `any` types (use `unknown` if needed)
- Explicit return types for public functions
- Use `const` over `let`, never `var`

### Naming Conventions

- Files: `kebab-case.ts`
- Functions: `camelCase`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Interfaces: `PascalCase` (no `I` prefix)

### Example

```typescript
// Good
export class PathSanitizer {
  private allowedBasePaths: string[];

  sanitize(userPath: string, basePath: string): string {
    // Implementation
  }
}

// Bad
export class path_sanitizer {
  private AllowedBasePaths: any;

  Sanitize(UserPath, BasePath) {
    // Implementation
  }
}
```

---

## 🔐 Security Guidelines

### ALWAYS Test For:

1. **Path Traversal** - Test `../`, absolute paths, symlinks
2. **BiDi Attacks** - Test Unicode control characters
3. **Memory Limits** - Test with large inputs
4. **PII Leakage** - Ensure no sensitive data in logs
5. **Input Validation** - Test invalid types, ranges, patterns

### Security Test Example

```typescript
// tests/security/path-traversal.test.ts
describe("Path Traversal Prevention", () => {
  it("should reject ../ paths", () => {
    const sanitizer = new PathSanitizer(["/templates"]);
    expect(() => sanitizer.sanitize("../etc/passwd", "/templates"))
      .toThrow("PATH_TRAVERSAL");
  });
});
```

---

## 🌍 Hebrew/RTL Guidelines

### ALWAYS Test For:

1. **Nikud** (vowel marks): `שָׁלוֹם`
2. **Gershayim**: `צה״ל`
3. **Final letters**: `ך, ם, ן, ף, ץ`
4. **Mixed direction**: `ABC שלום 123`
5. **Email in Hebrew**: `מייל: user@example.com`
6. **Currency**: `1,234.56 ₪`

### Hebrew Test Example

```typescript
// tests/hebrew/nikud.test.ts
describe("Nikud (Vowel Marks)", () => {
  it("should render Hebrew with nikud correctly", async () => {
    const text = "שָׁלוֹם עוֹלָם";
    const pdf = await generatePDF({ text });
    expect(pdf).toContainHebrewText(text);
  });
});
```

---

## 📦 Contributing Templates

### Template Structure

```
templates/category/template-name/
├── template.pdf       # Blank PDF form
├── template.json      # Field definitions
├── checksum.sha256    # SHA-256 hash
├── preview.png        # Optional preview image
└── README.md          # Template documentation
```

### Template Checklist

- [ ] Strong legal disclaimer included
- [ ] All fields defined in `template.json`
- [ ] SHA-256 checksum generated
- [ ] PDF has no JavaScript or embedded files
- [ ] Hebrew text tested for edge cases
- [ ] Test coverage >= 90%

### Generate Checksum

```bash
# Generate SHA-256 checksum
npm run generate:checksums
```

---

## 🔍 Pull Request Process

### Before Submitting

1. **Write tests first** (TDD)
2. **Run QA Agent**: `npm run qa:stage6`
3. **Check coverage**: `npm run test:coverage`
4. **Run linter**: `npm run lint:fix`
5. **Build succeeds**: `npm run build`

### PR Title Format

```
type(scope): Brief description

Examples:
feat(security): Add BiDi attack prevention
fix(validators): Correct Israeli ID validation
docs(readme): Update installation instructions
test(hebrew): Add nikud edge case tests
```

### PR Requirements

- [ ] All tests pass
- [ ] Coverage >= 90% (95% for security)
- [ ] QA Agent passes
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Security audit clean
- [ ] Follows TDD methodology

---

## 🧪 Coverage Requirements

| Component | Minimum Coverage |
|-----------|-----------------|
| `src/security/**` | 95% |
| `src/validators/**` | 95% |
| `src/engines/**` | 90% |
| `src/templates/**` | 90% |
| `src/tools/**` | 85% |

---

## 📚 Resources

- [TDD Guide](./docs/04-TDD-Development-Stages.md)
- [Architecture](./docs/02-Architecture-Design.md)
- [Security Specification](./docs/05-Security-Specification.md)

---

## ❓ Questions?

- **GitHub Discussions**: https://github.com/right-flow/rightflow-mcp-server/discussions
- **Issues**: https://github.com/right-flow/rightflow-mcp-server/issues

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.
