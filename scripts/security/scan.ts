#!/usr/bin/env npx ts-node

/**
 * Security Audit Scanner
 *
 * Comprehensive security scanning for RightFlow project
 * Run: npx ts-node scripts/security/scan.ts [--stage X] [--quick] [--fix]
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
interface SecurityConfig {
  severityThreshold: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  stage?: number;
  quick: boolean;
  fix: boolean;
}

interface Finding {
  id: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  file?: string;
  line?: number;
  description: string;
  recommendation: string;
  autoFixable: boolean;
}

interface ScanReport {
  timestamp: string;
  stage: number | null;
  duration: number;
  status: 'PASSED' | 'WARNINGS' | 'FAILED';
  findings: Finding[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const log = {
  info: (msg: string) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}[OK]${colors.reset} ${msg}`),
  header: (msg: string) => console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}\n`),
};

// Secret patterns to detect
const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp; severity: 'CRITICAL' | 'HIGH' }> = [
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g, severity: 'CRITICAL' },
  { name: 'AWS Secret Key', pattern: /aws_secret_access_key\s*=\s*["'][^"']{40}/gi, severity: 'CRITICAL' },
  { name: 'OpenAI API Key', pattern: /sk-[a-zA-Z0-9]{24,}/g, severity: 'CRITICAL' },
  { name: 'GitHub Token', pattern: /ghp_[a-zA-Z0-9]{36}/g, severity: 'CRITICAL' },
  { name: 'GitHub OAuth', pattern: /gho_[a-zA-Z0-9]{36}/g, severity: 'CRITICAL' },
  { name: 'Generic API Key', pattern: /["']?api[_-]?key["']?\s*[:=]\s*["'][a-zA-Z0-9_-]{20,}["']/gi, severity: 'HIGH' },
  { name: 'Generic Secret', pattern: /["']?secret["']?\s*[:=]\s*["'][a-zA-Z0-9_-]{20,}["']/gi, severity: 'HIGH' },
  { name: 'Private Key', pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g, severity: 'CRITICAL' },
  { name: 'JWT Token', pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, severity: 'HIGH' },
  { name: 'Clerk Secret Key', pattern: /sk_(?:test|live)_[a-zA-Z0-9]{20,}/g, severity: 'CRITICAL' },
  { name: 'Database URL with password', pattern: /postgres(?:ql)?:\/\/[^:]+:[^@]+@/gi, severity: 'CRITICAL' },
];

// Injection patterns to detect
const INJECTION_PATTERNS: Array<{ name: string; pattern: RegExp; severity: 'CRITICAL' | 'HIGH' }> = [
  { name: 'SQL Injection (template literal)', pattern: /(?:query|execute|raw)\s*\(\s*`[^`]*\$\{/g, severity: 'CRITICAL' },
  { name: 'SQL Injection (concatenation)', pattern: /(?:query|execute)\s*\([^)]*\+\s*(?:req\.|params\.|body\.)/g, severity: 'CRITICAL' },
  { name: 'Command Injection', pattern: /(?:exec|execSync|spawn|spawnSync)\s*\([^)]*\$\{/g, severity: 'CRITICAL' },
  { name: 'Unsafe innerHTML', pattern: /innerHTML\s*=/g, severity: 'HIGH' },
  { name: 'dangerouslySetInnerHTML', pattern: /dangerouslySetInnerHTML/g, severity: 'HIGH' },
  { name: 'Unsafe eval', pattern: /\beval\s*\(/g, severity: 'CRITICAL' },
  { name: 'new Function()', pattern: /new\s+Function\s*\(/g, severity: 'HIGH' },
];

// Sensitive data in logs
const LOG_PATTERNS: Array<{ name: string; pattern: RegExp; severity: 'HIGH' | 'MEDIUM' }> = [
  { name: 'Password in logs', pattern: /console\.(log|info|warn|error)\s*\([^)]*password/gi, severity: 'HIGH' },
  { name: 'Token in logs', pattern: /console\.(log|info|warn|error)\s*\([^)]*token/gi, severity: 'HIGH' },
  { name: 'Secret in logs', pattern: /logger\.(info|warn|error|debug)\s*\([^)]*(?:password|token|secret)/gi, severity: 'HIGH' },
];

class SecurityScanner {
  private config: SecurityConfig;
  private findings: Finding[] = [];
  private projectRoot: string;

  constructor(config: SecurityConfig) {
    this.config = config;
    this.projectRoot = process.cwd();
  }

  async run(): Promise<ScanReport> {
    const startTime = Date.now();

    this.printHeader();

    // Run all scans
    await this.runDependencyScan();
    if (!this.config.quick) {
      await this.runSecretsScan();
      await this.runInjectionScan();
      await this.runLogScan();
      await this.runConfigurationScan();
      await this.runSecurityHeadersScan();
    } else {
      await this.runSecretsScan(); // Always run secrets even in quick mode
    }

    const duration = (Date.now() - startTime) / 1000;

    const report = this.generateReport(duration);
    this.printReport(report);

    return report;
  }

  private printHeader(): void {
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.bold}${colors.cyan}  🔒 Security Audit Agent${colors.reset}`);
    console.log('='.repeat(60));
    console.log(`Stage: ${this.config.stage || 'All'}`);
    console.log(`Mode: ${this.config.quick ? 'Quick' : 'Full'}`);
    console.log(`Threshold: ${this.config.severityThreshold}`);
    console.log('='.repeat(60) + '\n');
  }

  private async runDependencyScan(): Promise<void> {
    log.header('📦 Dependency Vulnerability Scan');

    try {
      // Run npm audit
      const auditResult = execSync('npm audit --json 2>/dev/null || true', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      });

      try {
        const audit = JSON.parse(auditResult);

        if (audit.vulnerabilities) {
          const severityMap: Record<string, 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'> = {
            critical: 'CRITICAL',
            high: 'HIGH',
            moderate: 'MEDIUM',
            low: 'LOW',
          };

          for (const [name, vuln] of Object.entries(audit.vulnerabilities) as [string, any][]) {
            const severity = severityMap[vuln.severity] || 'MEDIUM';
            this.findings.push({
              id: `SCS-001-${name}`,
              category: 'Supply Chain',
              severity,
              title: `Vulnerable dependency: ${name}`,
              description: `${vuln.via?.[0]?.title || 'Security vulnerability'} in ${name}@${vuln.range}`,
              recommendation: vuln.fixAvailable ? `Run: npm audit fix` : 'Update manually or find alternative package',
              autoFixable: !!vuln.fixAvailable,
            });
          }

          const counts = audit.metadata?.vulnerabilities || {};
          log.info(`Found: ${counts.critical || 0} critical, ${counts.high || 0} high, ${counts.moderate || 0} moderate, ${counts.low || 0} low`);
        } else {
          log.success('No vulnerabilities found');
        }
      } catch {
        log.warn('Could not parse npm audit output');
      }
    } catch (error) {
      log.warn('npm audit failed - continuing with other checks');
    }

    // Check lockfile integrity
    if (!fs.existsSync(path.join(this.projectRoot, 'package-lock.json'))) {
      this.findings.push({
        id: 'SCS-003',
        category: 'Supply Chain',
        severity: 'HIGH',
        title: 'Missing package-lock.json',
        description: 'No lockfile found. Dependencies may be inconsistent between installs.',
        recommendation: 'Run `npm install` to generate package-lock.json',
        autoFixable: true,
      });
    }
  }

  private async runSecretsScan(): Promise<void> {
    log.header('🔑 Secrets Detection Scan');

    const filesToScan = this.getSourceFiles();
    let secretsFound = 0;

    for (const file of filesToScan) {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(this.projectRoot, file);

      for (const { name, pattern, severity } of SECRET_PATTERNS) {
        const matches = content.match(pattern);
        if (matches) {
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (pattern.test(lines[i])) {
              this.findings.push({
                id: `IAM-001-${name.replace(/\s/g, '-')}`,
                category: 'IAM',
                severity,
                title: `${name} detected`,
                file: relativePath,
                line: i + 1,
                description: `Potential ${name.toLowerCase()} found in source code`,
                recommendation: 'Move to environment variable or secrets manager',
                autoFixable: false,
              });
              secretsFound++;
            }
          }
        }
      }
    }

    if (secretsFound === 0) {
      log.success('No hardcoded secrets detected');
    } else {
      log.warn(`Found ${secretsFound} potential secrets`);
    }
  }

  private async runInjectionScan(): Promise<void> {
    log.header('💉 Injection Vulnerability Scan');

    const filesToScan = this.getSourceFiles();
    let injectionRisks = 0;

    for (const file of filesToScan) {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(this.projectRoot, file);
      const lines = content.split('\n');

      for (const { name, pattern, severity } of INJECTION_PATTERNS) {
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            this.findings.push({
              id: `IOV-${name.includes('SQL') ? '001' : name.includes('Command') ? '002' : '003'}`,
              category: 'Input/Output Validation',
              severity,
              title: `${name} risk`,
              file: relativePath,
              line: i + 1,
              description: `Potential ${name.toLowerCase()} vulnerability`,
              recommendation: 'Use parameterized queries or proper sanitization',
              autoFixable: false,
            });
            injectionRisks++;
          }
        }
      }
    }

    if (injectionRisks === 0) {
      log.success('No injection vulnerabilities detected');
    } else {
      log.warn(`Found ${injectionRisks} injection risks`);
    }
  }

  private async runLogScan(): Promise<void> {
    log.header('📝 Log Exposure Scan');

    const filesToScan = this.getSourceFiles();
    let logIssues = 0;

    for (const file of filesToScan) {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(this.projectRoot, file);
      const lines = content.split('\n');

      for (const { name, pattern, severity } of LOG_PATTERNS) {
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            this.findings.push({
              id: `DEP-001-${logIssues}`,
              category: 'Data Protection',
              severity,
              title: name,
              file: relativePath,
              line: i + 1,
              description: 'Sensitive data may be exposed in logs',
              recommendation: 'Remove sensitive data from log statements or mask it',
              autoFixable: false,
            });
            logIssues++;
          }
        }
      }
    }

    if (logIssues === 0) {
      log.success('No sensitive data exposure in logs');
    } else {
      log.warn(`Found ${logIssues} log exposure issues`);
    }
  }

  private async runConfigurationScan(): Promise<void> {
    log.header('⚙️ Configuration Security Scan');

    // Check for env files in git
    const envFiles = ['.env', '.env.local', '.env.production'];
    const gitignorePath = path.join(this.projectRoot, '.gitignore');

    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf-8');

      for (const envFile of envFiles) {
        if (fs.existsSync(path.join(this.projectRoot, envFile))) {
          if (!gitignore.includes(envFile) && !gitignore.includes('.env*')) {
            this.findings.push({
              id: 'IAM-002',
              category: 'IAM',
              severity: 'CRITICAL',
              title: `${envFile} not in .gitignore`,
              file: envFile,
              description: 'Environment file may be committed to repository',
              recommendation: `Add ${envFile} to .gitignore`,
              autoFixable: true,
            });
          }
        }
      }
    }

    // Check for debug mode in production config
    const viteConfig = path.join(this.projectRoot, 'packages/app/vite.config.ts');
    if (fs.existsSync(viteConfig)) {
      const content = fs.readFileSync(viteConfig, 'utf-8');
      if (content.includes('sourcemap: true') && !content.includes("process.env.NODE_ENV !== 'production'")) {
        this.findings.push({
          id: 'SEC-006',
          category: 'Security Configuration',
          severity: 'MEDIUM',
          title: 'Source maps enabled',
          file: 'packages/app/vite.config.ts',
          description: 'Source maps may expose source code in production',
          recommendation: 'Disable source maps in production builds',
          autoFixable: true,
        });
      }
    }

    log.success('Configuration scan complete');
  }

  private async runSecurityHeadersScan(): Promise<void> {
    log.header('🛡️ Security Headers Scan');

    // Check for helmet in backend
    const backendPackage = path.join(this.projectRoot, 'packages/app/backend/package.json');
    if (fs.existsSync(backendPackage)) {
      const pkg = JSON.parse(fs.readFileSync(backendPackage, 'utf-8'));

      if (!pkg.dependencies?.helmet) {
        this.findings.push({
          id: 'SEC-001',
          category: 'Security Headers',
          severity: 'HIGH',
          title: 'Missing Helmet middleware',
          file: 'packages/app/backend/package.json',
          description: 'Helmet provides essential security headers (CSP, X-Frame-Options, etc.)',
          recommendation: 'Install and configure helmet: npm install helmet',
          autoFixable: true,
        });
      } else {
        log.success('Helmet middleware is installed');
      }

      // Check for rate limiting
      if (!pkg.dependencies?.['express-rate-limit']) {
        this.findings.push({
          id: 'RES-001',
          category: 'Resilience',
          severity: 'HIGH',
          title: 'Missing rate limiting',
          file: 'packages/app/backend/package.json',
          description: 'No rate limiting middleware found - vulnerable to DoS',
          recommendation: 'Install express-rate-limit: npm install express-rate-limit',
          autoFixable: true,
        });
      }
    }

    // Check CORS configuration
    const backendFiles = this.getSourceFiles().filter(f => f.includes('backend'));
    for (const file of backendFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes("origin: '*'") || content.includes('origin: "*"')) {
        this.findings.push({
          id: 'IAM-005',
          category: 'IAM',
          severity: 'MEDIUM',
          title: 'Overly permissive CORS',
          file: path.relative(this.projectRoot, file),
          description: 'CORS allows all origins - may expose API to unauthorized clients',
          recommendation: 'Restrict CORS to specific allowed origins',
          autoFixable: false,
        });
      }
    }
  }

  private getSourceFiles(): string[] {
    const files: string[] = [];
    const ignoreDirs = ['node_modules', 'dist', 'build', '.git', 'coverage', 'test-utils', '__tests__', '__mocks__'];
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          if (!ignoreDirs.includes(item)) {
            walk(fullPath);
          }
        } else if (extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    };

    walk(this.projectRoot);
    return files;
  }

  private generateReport(duration: number): ScanReport {
    const summary = {
      critical: this.findings.filter(f => f.severity === 'CRITICAL').length,
      high: this.findings.filter(f => f.severity === 'HIGH').length,
      medium: this.findings.filter(f => f.severity === 'MEDIUM').length,
      low: this.findings.filter(f => f.severity === 'LOW').length,
    };

    let status: 'PASSED' | 'WARNINGS' | 'FAILED' = 'PASSED';
    const threshold = this.config.severityThreshold;

    if (summary.critical > 0) {
      status = 'FAILED';
    } else if (threshold === 'CRITICAL' && summary.high > 0) {
      status = 'WARNINGS';
    } else if (threshold === 'HIGH' && (summary.high > 0 || summary.medium > 0)) {
      status = summary.high > 0 ? 'FAILED' : 'WARNINGS';
    } else if (threshold === 'MEDIUM' && (summary.medium > 0 || summary.high > 0)) {
      status = 'FAILED';
    }

    return {
      timestamp: new Date().toISOString(),
      stage: this.config.stage || null,
      duration,
      status,
      findings: this.findings,
      summary,
    };
  }

  private printReport(report: ScanReport): void {
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.bold}${colors.cyan}  📊 Security Audit Report${colors.reset}`);
    console.log('='.repeat(60));

    // Status
    const statusColor = report.status === 'PASSED' ? colors.green :
                       report.status === 'WARNINGS' ? colors.yellow : colors.red;
    const statusIcon = report.status === 'PASSED' ? '✅' :
                      report.status === 'WARNINGS' ? '⚠️' : '❌';
    console.log(`\n${colors.bold}Status: ${statusColor}${statusIcon} ${report.status}${colors.reset}`);
    console.log(`Duration: ${report.duration.toFixed(2)}s`);

    // Summary table
    console.log('\n┌──────────────┬───────┐');
    console.log('│   Severity   │ Count │');
    console.log('├──────────────┼───────┤');
    console.log(`│ ${colors.red}CRITICAL${colors.reset}     │   ${report.summary.critical.toString().padStart(2)}  │`);
    console.log(`│ ${colors.yellow}HIGH${colors.reset}         │   ${report.summary.high.toString().padStart(2)}  │`);
    console.log(`│ MEDIUM       │   ${report.summary.medium.toString().padStart(2)}  │`);
    console.log(`│ LOW          │   ${report.summary.low.toString().padStart(2)}  │`);
    console.log('└──────────────┴───────┘');

    // Critical findings
    const criticalFindings = report.findings.filter(f => f.severity === 'CRITICAL');
    if (criticalFindings.length > 0) {
      console.log(`\n${colors.red}${colors.bold}🚨 CRITICAL FINDINGS (Blocking)${colors.reset}\n`);
      for (const finding of criticalFindings) {
        console.log(`  ${colors.red}[${finding.id}]${colors.reset} ${finding.title}`);
        if (finding.file) {
          console.log(`    📁 ${finding.file}${finding.line ? `:${finding.line}` : ''}`);
        }
        console.log(`    💡 ${finding.recommendation}`);
        console.log();
      }
    }

    // High severity findings
    const highFindings = report.findings.filter(f => f.severity === 'HIGH');
    if (highFindings.length > 0) {
      console.log(`\n${colors.yellow}${colors.bold}⚠️ HIGH SEVERITY FINDINGS${colors.reset}\n`);
      for (const finding of highFindings) {
        console.log(`  ${colors.yellow}[${finding.id}]${colors.reset} ${finding.title}`);
        if (finding.file) {
          console.log(`    📁 ${finding.file}${finding.line ? `:${finding.line}` : ''}`);
        }
        console.log(`    💡 ${finding.recommendation}`);
        console.log();
      }
    }

    // Medium findings (summarized)
    const mediumFindings = report.findings.filter(f => f.severity === 'MEDIUM');
    if (mediumFindings.length > 0) {
      console.log(`\n${colors.bold}📋 MEDIUM SEVERITY (${mediumFindings.length} findings)${colors.reset}`);
      for (const finding of mediumFindings.slice(0, 5)) {
        console.log(`  • [${finding.id}] ${finding.title}`);
      }
      if (mediumFindings.length > 5) {
        console.log(`  ... and ${mediumFindings.length - 5} more`);
      }
    }

    console.log('\n' + '='.repeat(60));

    // Exit code
    if (report.status === 'FAILED') {
      process.exitCode = 1;
    }
  }
}

// CLI Entry Point
async function main() {
  const args = process.argv.slice(2);

  const config: SecurityConfig = {
    severityThreshold: 'HIGH',
    quick: args.includes('--quick'),
    fix: args.includes('--fix'),
    stage: undefined,
  };

  const stageIndex = args.indexOf('--stage');
  if (stageIndex !== -1 && args[stageIndex + 1]) {
    config.stage = parseInt(args[stageIndex + 1], 10);
  }

  const thresholdIndex = args.indexOf('--threshold');
  if (thresholdIndex !== -1 && args[thresholdIndex + 1]) {
    config.severityThreshold = args[thresholdIndex + 1].toUpperCase() as any;
  }

  const scanner = new SecurityScanner(config);
  await scanner.run();
}

main().catch(console.error);