# Security Audit Agent Skill Definition

## Overview

The Security Audit Agent (`/security-audit`) is a comprehensive security scanner that runs automatically at the end of each development stage. It performs static analysis, dependency scanning, and security best-practice validation.

## Skill Metadata

```yaml
name: security-audit
trigger: /security-audit
auto-run-stages: [1, 2, 3, 4, 5, 7, 8]
blocking: true  # Blocks deployment if critical issues found
severity-threshold: HIGH  # Minimum severity to report
```

## Security Check Categories

### 1. Identity & Access Management (IAM)

| Check ID | Description | Severity | Auto-fix |
|----------|-------------|----------|----------|
| IAM-001 | Hardcoded secrets in source code | CRITICAL | No |
| IAM-002 | API keys in environment files committed to git | CRITICAL | No |
| IAM-003 | Weak JWT configuration (no expiration, weak algorithm) | HIGH | Partial |
| IAM-004 | Missing authentication middleware on protected routes | HIGH | No |
| IAM-005 | Overly permissive CORS configuration | MEDIUM | Yes |

**Detection Patterns:**
```regex
# IAM-001: Hardcoded secrets
(password|secret|api[_-]?key|token|auth|credential)\s*[:=]\s*["'][^"']{8,}["']
sk-[a-zA-Z0-9]{24,}
ghp_[a-zA-Z0-9]{36}
AKIA[0-9A-Z]{16}
```

### 2. Input/Output Validation

| Check ID | Description | Severity | Auto-fix |
|----------|-------------|----------|----------|
| IOV-001 | SQL Injection vulnerabilities | CRITICAL | No |
| IOV-002 | Command Injection vulnerabilities | CRITICAL | No |
| IOV-003 | XSS vulnerabilities (missing sanitization) | HIGH | Partial |
| IOV-004 | Path Traversal vulnerabilities | HIGH | No |
| IOV-005 | Missing input validation on API endpoints | MEDIUM | No |
| IOV-006 | Prompt Injection patterns (AI/LLM specific) | HIGH | No |

**Detection Patterns:**
```regex
# IOV-001: SQL Injection
(query|execute|raw)\s*\(\s*[`'"].*\$\{
db\.(query|execute)\s*\([^,]+\+

# IOV-002: Command Injection
(exec|execSync|spawn|spawnSync)\s*\([^)]*\$\{
child_process\.(exec|spawn)

# IOV-003: XSS
innerHTML\s*=
dangerouslySetInnerHTML
document\.write\(
```

### 3. Data Encryption & Protection

| Check ID | Description | Severity | Auto-fix |
|----------|-------------|----------|----------|
| DEP-001 | Sensitive data in logs | HIGH | No |
| DEP-002 | Missing HTTPS enforcement | HIGH | Yes |
| DEP-003 | Weak encryption algorithms | MEDIUM | No |
| DEP-004 | PII exposed in API responses | HIGH | No |
| DEP-005 | Missing data encryption at rest | MEDIUM | No |

**Detection Patterns:**
```regex
# DEP-001: Sensitive data in logs
console\.(log|info|warn|error)\s*\([^)]*password
logger\.(info|warn|error)\s*\([^)]*token
```

### 4. Supply Chain Security

| Check ID | Description | Severity | Auto-fix |
|----------|-------------|----------|----------|
| SCS-001 | Vulnerable dependencies (CVE) | CRITICAL/HIGH | Partial |
| SCS-002 | Outdated dependencies with security patches | MEDIUM | Yes |
| SCS-003 | Missing lockfile integrity | HIGH | Yes |
| SCS-004 | Typosquatting risk packages | HIGH | No |
| SCS-005 | Untrusted package sources | MEDIUM | No |

### 5. Security Headers & Configuration

| Check ID | Description | Severity | Auto-fix |
|----------|-------------|----------|----------|
| SEC-001 | Missing Content-Security-Policy header | HIGH | Yes |
| SEC-002 | Missing X-Frame-Options header | MEDIUM | Yes |
| SEC-003 | Missing X-Content-Type-Options header | MEDIUM | Yes |
| SEC-004 | Missing HSTS header | MEDIUM | Yes |
| SEC-005 | Missing rate limiting | HIGH | No |
| SEC-006 | Stack traces exposed in production | HIGH | Yes |

### 6. Resilience & DoS Prevention

| Check ID | Description | Severity | Auto-fix |
|----------|-------------|----------|----------|
| RES-001 | Missing rate limiting on public endpoints | HIGH | No |
| RES-002 | Unbounded query results | MEDIUM | No |
| RES-003 | Large file upload without limits | HIGH | No |
| RES-004 | Missing request size limits | MEDIUM | Yes |
| RES-005 | Synchronous operations blocking event loop | MEDIUM | No |

### 7. Error Handling & Information Disclosure

| Check ID | Description | Severity | Auto-fix |
|----------|-------------|----------|----------|
| ERR-001 | Stack traces in production error responses | HIGH | Yes |
| ERR-002 | Detailed error messages exposing internals | MEDIUM | No |
| ERR-003 | Database error messages exposed to client | HIGH | No |
| ERR-004 | Missing global error handler | MEDIUM | No |

### 8. Session & Authentication

| Check ID | Description | Severity | Auto-fix |
|----------|-------------|----------|----------|
| SES-001 | Missing secure cookie flags | HIGH | Yes |
| SES-002 | Session fixation vulnerability | HIGH | No |
| SES-003 | Token never expires | CRITICAL | No |
| SES-004 | Missing CSRF protection | HIGH | No |
| SES-005 | Weak password requirements | MEDIUM | No |

### 9. Audit & Logging

| Check ID | Description | Severity | Auto-fix |
|----------|-------------|----------|----------|
| AUD-001 | Missing authentication event logging | MEDIUM | No |
| AUD-002 | Missing security event logging | MEDIUM | No |
| AUD-003 | Missing audit trail for sensitive operations | MEDIUM | No |
| AUD-004 | Log injection vulnerabilities | HIGH | No |

## Execution Protocol

### Pre-Scan Announcement
```
🔒 Security Audit Agent Starting...
Stage: [Current Stage]
Scan Type: [Full / Incremental]
Categories: IAM, IOV, DEP, SCS, SEC, RES, ERR, SES, AUD
Expected Duration: ~2-5 minutes
```

### Scan Execution Flow

```
1. Dependency Scan (npm audit)
   ├── Check for known CVEs
   ├── Verify lockfile integrity
   └── Flag outdated packages

2. Static Code Analysis (ESLint + custom rules)
   ├── Hardcoded secrets detection
   ├── Injection vulnerability patterns
   ├── Unsafe API usage patterns
   └── Security anti-patterns

3. Configuration Review
   ├── Environment variables validation
   ├── Security headers check
   └── CORS configuration review

4. Runtime Configuration (if applicable)
   ├── Rate limiting verification
   ├── Error handling verification
   └── Logging configuration review

5. Report Generation
   ├── Categorize findings by severity
   ├── Generate fix recommendations
   └── Create compliance checklist
```

### Post-Scan Report Format

```markdown
## 🔒 Security Audit Report

**Scan Date:** YYYY-MM-DD HH:MM
**Stage:** Stage X - [Name]
**Duration:** X.XX seconds
**Status:** ✅ PASSED / ⚠️ WARNINGS / ❌ FAILED

### Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0 | ✅ |
| HIGH | 2 | ⚠️ |
| MEDIUM | 5 | ⚠️ |
| LOW | 3 | ℹ️ |

### Critical Findings (Blocking)

[None or list of critical issues]

### High Severity Findings

1. **[IAM-001]** Hardcoded API key detected
   - File: `src/services/api.ts:45`
   - Pattern: `apiKey = "sk-..."`
   - Fix: Move to environment variable
   - Blocking: Yes

### Medium Severity Findings

[List with recommendations]

### Low Severity / Informational

[List for awareness]

### Compliance Checklist

- [x] No hardcoded secrets
- [x] Dependencies scanned
- [ ] Rate limiting configured
- [x] HTTPS enforced
- [ ] Security headers configured

### Recommended Actions

1. **Immediate (before merge):**
   - Fix IAM-001: Remove hardcoded API key
   - Fix IOV-003: Add input sanitization

2. **Short-term (next sprint):**
   - Configure rate limiting
   - Add security headers middleware

3. **Long-term (backlog):**
   - Implement audit logging
   - Add CSRF protection
```

## Integration Points

### CI/CD Pipeline

```yaml
# GitHub Actions integration
security-audit:
  runs-on: ubuntu-latest
  steps:
    - name: Security Audit
      run: npm run security:audit
      env:
        SECURITY_THRESHOLD: HIGH
```

### Pre-commit Hook

```bash
# .husky/pre-commit
npm run security:quick  # Fast scan for critical issues only
```

### Stage-Specific Behavior

| Stage | Scan Type | Blocking Threshold | Categories |
|-------|-----------|-------------------|------------|
| Stage 1 | Config only | None | IAM |
| Stage 2 | Partial | CRITICAL | IAM, SCS |
| Stage 3 | Full | CRITICAL | All |
| Stage 4 | Incremental | CRITICAL | Changed files |
| Stage 5 | Full | HIGH | All |
| Stage 7 | Full + Deep | MEDIUM | All + Manual review |
| Stage 8 | Verification | CRITICAL | Deployment config |

## Configuration

### .security-audit.json

```json
{
  "version": "1.0.0",
  "enabled": true,
  "severityThreshold": "HIGH",
  "categories": {
    "IAM": { "enabled": true, "severity": "CRITICAL" },
    "IOV": { "enabled": true, "severity": "CRITICAL" },
    "DEP": { "enabled": true, "severity": "HIGH" },
    "SCS": { "enabled": true, "severity": "HIGH" },
    "SEC": { "enabled": true, "severity": "MEDIUM" },
    "RES": { "enabled": true, "severity": "MEDIUM" },
    "ERR": { "enabled": true, "severity": "MEDIUM" },
    "SES": { "enabled": true, "severity": "HIGH" },
    "AUD": { "enabled": true, "severity": "LOW" }
  },
  "ignore": {
    "paths": [
      "node_modules/**",
      "dist/**",
      "**/*.test.ts",
      "**/*.spec.ts"
    ],
    "rules": []
  },
  "customPatterns": [],
  "reporting": {
    "format": "markdown",
    "outputPath": "security-reports/",
    "notifyOnCritical": true
  }
}
```

## ESLint Security Plugin Configuration

Add to `.eslintrc.js`:

```javascript
module.exports = {
  plugins: ['security'],
  extends: ['plugin:security/recommended'],
  rules: {
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'warn',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-non-literal-require': 'warn',
    'security/detect-possible-timing-attacks': 'warn',
    'security/detect-pseudoRandomBytes': 'error',
    'security/detect-bidi-characters': 'error'
  }
};
```

## Manual Security Review Checklist

For Stage 7 (Pre-Deployment), human review required for:

- [ ] Authentication flow security
- [ ] Authorization logic correctness
- [ ] Data exposure in API responses
- [ ] Third-party integration security
- [ ] Environment-specific configurations
- [ ] Backup and recovery procedures
- [ ] Incident response readiness

## Metrics & Tracking

Track over time:
- Security debt score
- Time to remediate by severity
- Recurring vulnerability patterns
- Dependency update frequency
- False positive rate (for tuning)

---

*This security audit agent is designed for RightFlow 2.0 and should be customized for specific compliance requirements (SOC 2, ISO 27001, etc.) as needed.*