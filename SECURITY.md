# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

---

## Security Features

RightFlow CoWork implements **8-layer security architecture** to protect against common threats:

### 1. Path Sanitizer
- **Protection**: Path traversal attacks (`../`, absolute paths, symlinks)
- **Test Coverage**: 100%

### 2. Rate Limiter
- **Protection**: DoS attacks, resource exhaustion
- **Limits**: 20 requests/min, 3 concurrent, 5s cooldown after errors

### 3. Memory Manager
- **Protection**: Out-of-memory attacks
- **Limits**: 100MB per document, 500MB total, 50 documents per batch

### 4. Input Validator
- **Protection**: Injection attacks, type confusion
- **Method**: Zod schema validation with strict types

### 5. Hebrew Sanitizer (Extended)
- **Protection**: BiDi attacks, zero-width characters, homograph attacks
- **Coverage**: U+202A-E, U+2066-69, U+200B-D, U+FEFF, and more
- **Test Coverage**: 100%

### 6. Template Verifier
- **Protection**: Tampered templates, malicious PDFs
- **Method**: SHA-256 checksums, PDF safety scan (no JavaScript/embedded files)

### 7. PII Handler
- **Protection**: Data leakage, privacy violations
- **Method**: Sensitive field detection, secure memory cleanup, no PII in logs

### 8. Audit Logger
- **Protection**: Compliance, incident response
- **Method**: Local JSONL logging with PII-safe entries

---

## Reporting a Vulnerability

**PLEASE DO NOT** report security vulnerabilities through public GitHub issues.

### How to Report

**Email**: security@rightflow.io (if available) or create a [GitHub Security Advisory](https://github.com/right-flow/rightflow-mcp-server/security/advisories/new)

**Include**:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

| Severity | Response Time | Fix Timeline |
|----------|--------------|--------------|
| Critical | 24 hours | 72 hours |
| High | 72 hours | 1 week |
| Medium | 1 week | 2 weeks |
| Low | 2 weeks | 4 weeks |

### Disclosure Policy

- **Private disclosure**: 90 days before public disclosure
- **Early disclosure**: If vulnerability is being actively exploited
- **Credit**: Reporter will be credited (unless they prefer anonymity)

---

## Security Testing

All security features are tested with:

```bash
# Run all security tests
npm run test:security

# Run specific security test
npm test -- tests/security/path-traversal.test.ts
npm test -- tests/security/bidi-attacks.test.ts
npm test -- tests/security/pii-leakage.test.ts

# Run with coverage
npm run test:security -- --coverage
```

**Required Coverage**: 95%+ for all security components

---

## Security Audit History

| Date | Version | Auditor | Findings |
|------|---------|---------|----------|
| TBD | 0.1.0 | Internal | Pending |

---

## Known Security Limitations

### Templates
- **Community-contributed templates** have NOT received professional security review
- Users are responsible for validating template integrity
- Custom templates bypass built-in security checks (user responsibility)

### Local Execution
- Security relies on Node.js security model
- No sandboxing of template rendering (pdf-lib is trusted)
- Audit logs stored locally (can be deleted by user)

### BiDi Protection
- Protects against known BiDi attack vectors (as of 2026)
- New Unicode exploits may emerge - keep updated

---

## Security Best Practices for Users

### 1. Keep Updated
```bash
# Check for updates regularly
npm outdated -g @rightflow/mcp-server

# Update to latest
npm update -g @rightflow/mcp-server
```

### 2. Audit Custom Templates
- Always review custom templates before use
- Verify checksums match expected values
- Use only templates from trusted sources

### 3. Enable Audit Logging (Optional)
```bash
# Set environment variable
export AUDIT_LOG_ENABLED=true
export AUDIT_LOG_PATH="~/.rightflow/audit.jsonl"
```

### 4. Review Generated Documents
- Always review PDFs before sharing
- Check for unintended content
- Verify Hebrew text renders correctly

### 5. Report Suspicious Activity
- Unexpected file access attempts
- Unusual memory usage
- Rate limit violations

---

## Security Checklist for Contributors

**Before submitting code:**

- [ ] All security tests pass
- [ ] Coverage >= 95% for security components
- [ ] No hardcoded secrets (API keys, passwords)
- [ ] No console.log with sensitive data
- [ ] Path traversal protection tested
- [ ] BiDi sanitization tested
- [ ] PII handling verified
- [ ] Input validation with Zod schemas
- [ ] Error messages sanitized (no PII)

**For template contributions:**

- [ ] SHA-256 checksum generated
- [ ] PDF safety validated (no JavaScript)
- [ ] Strong legal disclaimer included
- [ ] No embedded files or external links
- [ ] Field definitions validated
- [ ] Test coverage for edge cases

---

## Dependencies Security

### Audit Dependencies Regularly

```bash
# Check for known vulnerabilities
npm audit

# Fix automatically (if possible)
npm audit fix

# High/critical only
npm audit --audit-level=high
```

### Dependency Security Tools

- **npm audit**: Built-in vulnerability scanner
- **Snyk**: Continuous monitoring (optional)
- **Dependabot**: Automated updates (GitHub)

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Unicode Security Considerations (TR#36)](https://unicode.org/reports/tr36/)
- [PDF Security Best Practices](https://pdfa.org/security/)
- [Israeli Privacy Protection Law](https://www.gov.il/en/departments/legalInfo/private_protection_law)

---

**Last Updated**: 2026-02-22
**Security Contact**: security@rightflow.io (or GitHub Security Advisories)
**PGP Key**: TBD
