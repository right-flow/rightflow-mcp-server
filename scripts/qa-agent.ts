#!/usr/bin/env tsx
/**
 * QA Agent - Automated Quality Assurance for TDD Workflow
 *
 * Usage: npm run qa:stageN (where N = 1-6)
 *
 * Stages:
 *   1 - Unit Tests Written (RED phase)
 *   2 - Feature Implemented (GREEN phase)
 *   3 - Integration Tests
 *   4 - Security Tests
 *   5 - Documentation
 *   6 - Pre-Release
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

interface StageConfig {
  stage: number;
  name: string;
  checks: Check[];
}

interface Check {
  name: string;
  command: string;
  required: boolean;
  minCoverage?: number;
}

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

const STAGE_CONFIGS: StageConfig[] = [
  {
    stage: 1,
    name: "Unit Tests Written (RED)",
    checks: [
      { name: "Test files exist", command: "ls tests/unit/**/*.test.ts", required: false },
    ],
  },
  {
    stage: 2,
    name: "Feature Implemented (GREEN)",
    checks: [
      { name: "Tests pass", command: "npm test", required: true },
      {
        name: "Coverage >= 90%",
        command: "npm run test:coverage",
        required: true,
        minCoverage: 90,
      },
      { name: "TypeScript compiles", command: "npm run typecheck", required: true },
      { name: "ESLint passes", command: "npm run lint", required: true },
    ],
  },
  {
    stage: 3,
    name: "Integration Tests",
    checks: [
      { name: "All tests pass", command: "npm test", required: true },
      {
        name: "Coverage >= 90%",
        command: "npm run test:coverage",
        required: true,
        minCoverage: 90,
      },
      { name: "TypeScript compiles", command: "npm run typecheck", required: true },
      { name: "ESLint passes", command: "npm run lint", required: true },
      { name: "Security audit", command: "npm audit --audit-level=high", required: true },
    ],
  },
  {
    stage: 4,
    name: "Security Tests",
    checks: [
      { name: "All tests pass", command: "npm test", required: true },
      { name: "Security tests pass", command: "npm run test:security", required: true },
      { name: "Hebrew tests pass", command: "npm run test:hebrew", required: true },
      {
        name: "Coverage >= 90%",
        command: "npm run test:coverage",
        required: true,
        minCoverage: 90,
      },
      { name: "TypeScript compiles", command: "npm run typecheck", required: true },
      { name: "ESLint passes", command: "npm run lint", required: true },
      { name: "Security audit", command: "npm audit --audit-level=high", required: true },
    ],
  },
  {
    stage: 5,
    name: "Documentation",
    checks: [
      { name: "All tests pass", command: "npm test", required: true },
      { name: "TypeScript compiles", command: "npm run typecheck", required: true },
      { name: "ESLint passes", command: "npm run lint", required: true },
    ],
  },
  {
    stage: 6,
    name: "Pre-Release",
    checks: [
      { name: "All tests pass", command: "npm test", required: true },
      { name: "Security tests pass", command: "npm run test:security", required: true },
      { name: "Hebrew tests pass", command: "npm run test:hebrew", required: true },
      {
        name: "Coverage >= 90%",
        command: "npm run test:coverage",
        required: true,
        minCoverage: 90,
      },
      { name: "TypeScript compiles", command: "npm run typecheck", required: true },
      { name: "ESLint passes", command: "npm run lint", required: true },
      { name: "Security audit", command: "npm audit --audit-level=high", required: true },
      { name: "Build succeeds", command: "npm run build", required: true },
    ],
  },
];

async function runQAAgent(stageNumber: number): Promise<void> {
  const config = STAGE_CONFIGS.find((s) => s.stage === stageNumber);

  if (!config) {
    console.error(`❌ Invalid stage: ${stageNumber}`);
    console.log("Valid stages: 1-6");
    process.exit(1);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`🤖 QA Agent - Stage ${stageNumber}: ${config.name}`);
  console.log(`${"=".repeat(60)}\n`);

  const results: CheckResult[] = [];
  let allPassed = true;

  for (const check of config.checks) {
    console.log(`\n▶️  Running: ${check.name}...`);

    try {
      // Execute the check
      execSync(check.command, { stdio: "inherit" });

      // Check coverage threshold if required
      if (check.minCoverage) {
        const coverage = getCoveragePercentage();
        if (coverage < check.minCoverage) {
          throw new Error(`Coverage ${coverage}% < ${check.minCoverage}% required`);
        }
        results.push({
          name: check.name,
          passed: true,
          message: `${coverage.toFixed(1)}% coverage`,
        });
      } else {
        results.push({
          name: check.name,
          passed: true,
          message: "Passed",
        });
      }

      console.log(`✅ ${check.name}: Passed`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (check.required) {
        allPassed = false;
      }

      results.push({
        name: check.name,
        passed: false,
        message: errorMessage || "Failed",
      });

      console.log(`${check.required ? "❌" : "⚠️"} ${check.name}: Failed`);
    }
  }

  // Print summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("📋 QA Agent Summary");
  console.log(`${"=".repeat(60)}\n`);

  for (const result of results) {
    const icon = result.passed ? "✅" : "❌";
    console.log(`${icon} ${result.name}: ${result.message}`);
  }

  console.log(`\n${"=".repeat(60)}`);

  if (allPassed) {
    console.log("✅ QA PASSED - Ready to proceed to next stage");
    console.log(`${"=".repeat(60)}\n`);
  } else {
    console.log("❌ QA FAILED - Fix issues before proceeding");
    console.log(`${"=".repeat(60)}\n`);
    process.exit(1);
  }
}

function getCoveragePercentage(): number {
  try {
    const coveragePath = path.join(process.cwd(), "coverage", "coverage-summary.json");

    if (!fs.existsSync(coveragePath)) {
      console.warn("⚠️  Coverage report not found");
      return 0;
    }

    const report = JSON.parse(fs.readFileSync(coveragePath, "utf-8"));
    return report.total.lines.pct;
  } catch (error) {
    console.warn("⚠️  Failed to parse coverage report:", error);
    return 0;
  }
}

// Main execution
const stage = parseInt(process.argv[2] || "2");

if (isNaN(stage) || stage < 1 || stage > 6) {
  console.error("❌ Invalid stage number. Must be 1-6");
  console.log("\nUsage: npm run qa:stageN (where N = 1-6)");
  console.log("\nStages:");
  STAGE_CONFIGS.forEach((config) => {
    console.log(`  ${config.stage}: ${config.name}`);
  });
  process.exit(1);
}

runQAAgent(stage).catch((error) => {
  console.error("❌ QA Agent failed:", error);
  process.exit(1);
});
