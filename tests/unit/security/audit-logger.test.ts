/**
 * Audit Logger - Security Tests
 *
 * TDD Stage 1 (RED): Write failing tests
 * Status: Tests written, implementation pending
 *
 * TDD Workflow:
 * 1. RED: Run this test - it should FAIL (no implementation yet)
 * 2. GREEN: Implement AuditLogger to make tests pass
 * 3. REFACTOR: Improve implementation quality
 * 4. QA: Run `npm run qa:stage2`
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, readFileSync, rmSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  AuditLogger,
  AuditLogEntry,
  AuditLogLevel,
} from "../../../src/security/auditLogger.js";

// Test log directory
const TEST_LOG_DIR = join(process.cwd(), "tests", "fixtures", "logs");

// Helper to get log files (filter out .machine-id)
function getLogFiles(dir: string): string[] {
  return readdirSync(dir).filter(f => f.endsWith('.jsonl'));
}

// Helper to read first log entry
function readFirstLogEntry(dir: string): AuditLogEntry {
  const files = getLogFiles(dir);
  const logContent = readFileSync(join(dir, files[0]), "utf-8");
  const lines = logContent.trim().split("\n");
  return JSON.parse(lines[0]);
}

// Helper to clean up directory with retry for Windows file locking
function cleanupLogDir(dir: string): void {
  if (!existsSync(dir)) {
    return;
  }

  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      try {
        const stats = statSync(fullPath);
        if (stats.isDirectory()) {
          rmSync(fullPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        } else {
          rmSync(fullPath, { force: true, maxRetries: 3, retryDelay: 100 });
        }
      } catch (error) {
        // Ignore cleanup errors
        console.warn(`Failed to cleanup ${fullPath}:`, error);
      }
    }
  } catch (error) {
    console.warn(`Failed to cleanup directory ${dir}:`, error);
  }
}

describe("AuditLogger", () => {
  let logger: AuditLogger;

  beforeEach(() => {
    // Clean up test log directory before each test
    cleanupLogDir(TEST_LOG_DIR);
  });

  afterEach(() => {
    // Clean up after tests
    if (logger) {
      try {
        logger.close();
      } catch (error) {
        // Ignore close errors
      }
    }
    // Give Windows time to release file handles (synchronous delay)
    const start = Date.now();
    while (Date.now() - start < 100) {
      // Busy wait for file handles to close
    }
    cleanupLogDir(TEST_LOG_DIR);
  });

  describe("Constructor", () => {
    it("should create with default config", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });
      expect(logger).toBeDefined();
    });

    it("should create with custom config", () => {
      logger = new AuditLogger({
        logDir: TEST_LOG_DIR,
        maxFileSize: 50 * 1024 * 1024, // 50MB
        retentionDays: 60,
        enableConsole: false,
      });
      expect(logger).toBeDefined();
    });

    it("should create log directory if not exists", () => {
      const customDir = join(TEST_LOG_DIR, "custom");
      logger = new AuditLogger({ logDir: customDir });

      expect(existsSync(customDir)).toBe(true);
    });

    it("should generate anonymous machine ID", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });
      const machineId = logger.getMachineId();

      expect(machineId).toBeDefined();
      expect(typeof machineId).toBe("string");
      expect(machineId.length).toBeGreaterThan(0);
    });

    it("should use consistent machine ID across instances", () => {
      const logger1 = new AuditLogger({ logDir: TEST_LOG_DIR });
      const machineId1 = logger1.getMachineId();
      logger1.close();

      const logger2 = new AuditLogger({ logDir: TEST_LOG_DIR });
      const machineId2 = logger2.getMachineId();
      logger2.close();

      expect(machineId1).toBe(machineId2);
    });
  });

  describe("JSONL Logging", () => {
    it("should log entry in JSONL format", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });

      logger.log({
        level: AuditLogLevel.INFO,
        action: "test_action",
        message: "Test message",
      });

      logger.flush();

      // Read log file (filter out .machine-id file)
      const files = readdirSync(TEST_LOG_DIR).filter(f => f.endsWith('.jsonl'));
      expect(files.length).toBe(1);

      const logContent = readFileSync(join(TEST_LOG_DIR, files[0]), "utf-8");
      const lines = logContent.trim().split("\n");

      expect(lines.length).toBe(1);

      // Parse JSONL
      const entry = JSON.parse(lines[0]);
      expect(entry.level).toBe("INFO");
      expect(entry.action).toBe("test_action");
      expect(entry.message).toBe("Test message");
      expect(entry.timestamp).toBeDefined();
      expect(entry.machineId).toBeDefined();
    });

    it("should log multiple entries as separate lines", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });

      logger.log({
        level: AuditLogLevel.INFO,
        action: "action1",
        message: "Message 1",
      });

      logger.log({
        level: AuditLogLevel.WARN,
        action: "action2",
        message: "Message 2",
      });

      logger.flush();

      const files = readdirSync(TEST_LOG_DIR).filter(f => f.endsWith('.jsonl'));
      const logContent = readFileSync(join(TEST_LOG_DIR, files[0]), "utf-8");
      const lines = logContent.trim().split("\n");

      expect(lines.length).toBe(2);

      const entry1 = JSON.parse(lines[0]);
      const entry2 = JSON.parse(lines[1]);

      expect(entry1.action).toBe("action1");
      expect(entry2.action).toBe("action2");
    });

    it("should include timestamp in ISO format", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });

      const beforeLog = new Date().toISOString();
      logger.log({
        level: AuditLogLevel.INFO,
        action: "test",
        message: "Test",
      });
      const afterLog = new Date().toISOString();

      logger.flush();

      const files = readdirSync(TEST_LOG_DIR).filter(f => f.endsWith('.jsonl'));
      const logContent = readFileSync(join(TEST_LOG_DIR, files[0]), "utf-8");
      const lines = logContent.trim().split("\n");
      const entry = JSON.parse(lines[0]);

      expect(entry.timestamp).toBeDefined();
      expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(entry.timestamp >= beforeLog).toBe(true);
      expect(entry.timestamp <= afterLog).toBe(true);
    });
  });

  describe("Log Levels", () => {
    it("should support INFO level", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });

      logger.info("test_action", "Info message");
      logger.flush();

      const entry = readFirstLogEntry(TEST_LOG_DIR);
      expect(entry.level).toBe("INFO");
    });

    it("should support WARN level", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });

      logger.warn("test_action", "Warning message");
      logger.flush();

      const entry = readFirstLogEntry(TEST_LOG_DIR);
      expect(entry.level).toBe("WARN");
    });

    it("should support ERROR level", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });

      logger.error("test_action", "Error message");
      logger.flush();

      const entry = readFirstLogEntry(TEST_LOG_DIR);
      expect(entry.level).toBe("ERROR");
    });

    it("should support SECURITY level", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });

      logger.security("test_action", "Security event");
      logger.flush();

      const entry = readFirstLogEntry(TEST_LOG_DIR);
      expect(entry.level).toBe("SECURITY");
    });
  });

  describe("Document Hash Logging", () => {
    it("should log document hash instead of content", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });

      logger.logDocumentAccess("user123", "Sensitive document content");
      logger.flush();

      const entry = readFirstLogEntry(TEST_LOG_DIR);
      expect(entry.action).toBe("document_access");
      expect(entry.documentHash).toBeDefined();
      expect(entry.documentHash).not.toBe("Sensitive document content");
      expect(entry.userId).toBe("user123");
    });

    it("should use SHA-256 for document hashing", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });

      logger.logDocumentAccess("user123", "test content");
      logger.flush();

      const entry = readFirstLogEntry(TEST_LOG_DIR);
      // SHA-256 hex = 64 characters
      expect(entry.documentHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should produce consistent hash for same content", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });

      logger.logDocumentAccess("user1", "same content");
      logger.logDocumentAccess("user2", "same content");
      logger.flush();

      const files = getLogFiles(TEST_LOG_DIR);
      const logContent = readFileSync(join(TEST_LOG_DIR, files[0]), "utf-8");
      const lines = logContent.trim().split("\n");

      const entry1 = JSON.parse(lines[0]);
      const entry2 = JSON.parse(lines[1]);

      expect(entry1.documentHash).toBe(entry2.documentHash);
    });

    it("should not log actual document content", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });

      const sensitiveContent = "Credit Card: 4111111111111111";
      logger.logDocumentAccess("user123", sensitiveContent);
      logger.flush();

      const files = getLogFiles(TEST_LOG_DIR);
      const logContent = readFileSync(join(TEST_LOG_DIR, files[0]), "utf-8");

      expect(logContent).not.toContain(sensitiveContent);
      expect(logContent).not.toContain("4111111111111111");
    });
  });

  describe("Metadata Logging", () => {
    it("should include custom metadata in log entries", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });

      logger.log({
        level: AuditLogLevel.INFO,
        action: "test_action",
        message: "Test message",
        metadata: {
          userId: "user123",
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0",
        },
      });

      logger.flush();

      const entry = readFirstLogEntry(TEST_LOG_DIR);
      expect(entry.metadata).toBeDefined();
      expect(entry.metadata.userId).toBe("user123");
      expect(entry.metadata.ipAddress).toBe("192.168.1.1");
      expect(entry.metadata.userAgent).toBe("Mozilla/5.0");
    });

    it("should handle metadata with nested objects", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });

      logger.log({
        level: AuditLogLevel.INFO,
        action: "test",
        message: "Test",
        metadata: {
          user: {
            id: "123",
            role: "admin",
          },
          request: {
            method: "POST",
            path: "/api/documents",
          },
        },
      });

      logger.flush();

      const entry = readFirstLogEntry(TEST_LOG_DIR);
      expect(entry.metadata.user.id).toBe("123");
      expect(entry.metadata.request.method).toBe("POST");
    });
  });

  describe("Log Rotation", () => {
    it("should rotate log when file size exceeds limit", () => {
      // Set very small max size to force rotation
      logger = new AuditLogger({
        logDir: TEST_LOG_DIR,
        maxFileSize: 500, // 500 bytes
      });

      // Write enough logs to exceed 500 bytes
      for (let i = 0; i < 20; i++) {
        logger.log({
          level: AuditLogLevel.INFO,
          action: `action_${i}`,
          message: `This is a longer message to increase file size - iteration ${i}`,
        });
      }

      logger.flush();

      const files = readdirSync(TEST_LOG_DIR);
      expect(files.length).toBeGreaterThan(1);
    });

    it("should name rotated files with timestamp", () => {
      logger = new AuditLogger({
        logDir: TEST_LOG_DIR,
        maxFileSize: 500,
      });

      for (let i = 0; i < 20; i++) {
        logger.log({
          level: AuditLogLevel.INFO,
          action: `action_${i}`,
          message: `Message ${i} with some content to increase size`,
        });
      }

      logger.flush();

      const files = readdirSync(TEST_LOG_DIR);
      const rotatedFiles = files.filter((f) => f.includes("audit-"));

      expect(rotatedFiles.length).toBeGreaterThan(0);
      expect(rotatedFiles[0]).toMatch(/audit-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
    });

    it("should continue logging to new file after rotation", () => {
      logger = new AuditLogger({
        logDir: TEST_LOG_DIR,
        maxFileSize: 500,
      });

      for (let i = 0; i < 30; i++) {
        logger.log({
          level: AuditLogLevel.INFO,
          action: `action_${i}`,
          message: `Message ${i} with content`,
        });
      }

      logger.flush();

      const files = getLogFiles(TEST_LOG_DIR);

      // Read all log files and count total entries
      let totalEntries = 0;
      for (const file of files) {
        const content = readFileSync(join(TEST_LOG_DIR, file), "utf-8");
        const lines = content.trim().split("\n").filter((l) => l.length > 0);
        totalEntries += lines.length;
      }

      expect(totalEntries).toBe(30);
    });
  });

  describe("Log Retention", () => {
    it("should delete logs older than retention period", () => {
      logger = new AuditLogger({
        logDir: TEST_LOG_DIR,
        retentionDays: 0, // Delete immediately for testing
      });

      logger.log({
        level: AuditLogLevel.INFO,
        action: "test",
        message: "Test",
      });

      logger.flush();

      // Trigger cleanup
      logger.cleanup();

      const files = getLogFiles(TEST_LOG_DIR);
      expect(files.length).toBe(1); // Current log file remains
    });

    it("should respect retention days configuration", () => {
      logger = new AuditLogger({
        logDir: TEST_LOG_DIR,
        retentionDays: 30,
      });

      expect(logger).toBeDefined();
    });
  });

  describe("Buffering and Flushing", () => {
    it("should buffer log entries before writing", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });

      logger.log({
        level: AuditLogLevel.INFO,
        action: "test",
        message: "Test",
      });

      // Before flush, log file should not exist yet (only .machine-id)
      const filesBefore = getLogFiles(TEST_LOG_DIR);
      expect(filesBefore.length).toBe(0);
    });

    it("should write to disk when flushed", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });

      logger.log({
        level: AuditLogLevel.INFO,
        action: "test",
        message: "Test",
      });

      logger.flush();

      const files = getLogFiles(TEST_LOG_DIR);
      expect(files.length).toBe(1);

      const logContent = readFileSync(join(TEST_LOG_DIR, files[0]), "utf-8");
      expect(logContent.trim().length).toBeGreaterThan(0);
    });

    it("should auto-flush after buffer limit", () => {
      logger = new AuditLogger({
        logDir: TEST_LOG_DIR,
        bufferSize: 5, // Flush after 5 entries
      });

      for (let i = 0; i < 6; i++) {
        logger.log({
          level: AuditLogLevel.INFO,
          action: `action_${i}`,
          message: `Message ${i}`,
        });
      }

      // Should auto-flush after 5 entries
      const files = readdirSync(TEST_LOG_DIR);
      expect(files.length).toBeGreaterThan(0);
    });

    it("should flush on close", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });

      logger.log({
        level: AuditLogLevel.INFO,
        action: "test",
        message: "Test",
      });

      logger.close();

      const files = getLogFiles(TEST_LOG_DIR);
      const logContent = readFileSync(join(TEST_LOG_DIR, files[0]), "utf-8");
      expect(logContent.trim().length).toBeGreaterThan(0);
    });
  });

  describe("Security Events", () => {
    it("should log authentication attempts", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });

      logger.logAuthAttempt("user123", true, "192.168.1.1");
      logger.flush();

      const entry = readFirstLogEntry(TEST_LOG_DIR);
      expect(entry.action).toBe("auth_attempt");
      expect(entry.level).toBe("SECURITY");
      expect(entry.userId).toBe("user123");
      expect(entry.success).toBe(true);
      expect(entry.ipAddress).toBe("192.168.1.1");
    });

    it("should log failed authentication attempts", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });

      logger.logAuthAttempt("user123", false, "192.168.1.1");
      logger.flush();

      const entry = readFirstLogEntry(TEST_LOG_DIR);
      expect(entry.success).toBe(false);
      expect(entry.level).toBe("SECURITY");
    });

    it("should log rate limit violations", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });

      logger.logRateLimitViolation("client123", "192.168.1.1");
      logger.flush();

      const entry = readFirstLogEntry(TEST_LOG_DIR);
      expect(entry.action).toBe("rate_limit_violation");
      expect(entry.level).toBe("SECURITY");
      expect(entry.clientId).toBe("client123");
    });

    it("should log security violations", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });

      logger.logSecurityViolation("Path traversal attempt", {
        path: "../etc/passwd",
        clientId: "client123",
      });
      logger.flush();

      const entry = readFirstLogEntry(TEST_LOG_DIR);
      expect(entry.action).toBe("security_violation");
      expect(entry.level).toBe("SECURITY");
      expect(entry.message).toBe("Path traversal attempt");
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid log directory gracefully", () => {
      // Use a path with invalid characters that will actually fail
      const invalidPath = process.platform === "win32"
        ? "C:\\invalid<>path\\logs"  // Invalid characters on Windows
        : "/root/noaccess/logs";      // No permission on Unix

      expect(() => {
        logger = new AuditLogger({ logDir: invalidPath });
      }).toThrow();
    });

    it("should handle write errors gracefully", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });

      // This should not throw
      expect(() => {
        logger.log({
          level: AuditLogLevel.INFO,
          action: "test",
          message: "Test",
        });
        logger.flush();
      }).not.toThrow();
    });

    it("should handle circular references in metadata", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });

      const circular: any = { a: 1 };
      circular.self = circular;

      expect(() => {
        logger.log({
          level: AuditLogLevel.INFO,
          action: "test",
          message: "Test",
          metadata: circular,
        });
      }).not.toThrow();
    });
  });

  describe("Query Logs", () => {
    it("should query logs by date range", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });

      logger.log({
        level: AuditLogLevel.INFO,
        action: "action1",
        message: "Message 1",
      });

      logger.log({
        level: AuditLogLevel.INFO,
        action: "action2",
        message: "Message 2",
      });

      logger.flush();

      const logs = logger.query({
        startDate: new Date(Date.now() - 1000),
        endDate: new Date(Date.now() + 1000),
      });

      expect(logs.length).toBe(2);
    });

    it("should query logs by action", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });

      logger.log({
        level: AuditLogLevel.INFO,
        action: "specific_action",
        message: "Message 1",
      });

      logger.log({
        level: AuditLogLevel.INFO,
        action: "other_action",
        message: "Message 2",
      });

      logger.flush();

      const logs = logger.query({ action: "specific_action" });

      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe("specific_action");
    });

    it("should query logs by level", () => {
      logger = new AuditLogger({ logDir: TEST_LOG_DIR });

      logger.info("action1", "Info message");
      logger.error("action2", "Error message");
      logger.flush();

      const errorLogs = logger.query({ level: AuditLogLevel.ERROR });

      expect(errorLogs.length).toBe(1);
      expect(errorLogs[0].level).toBe("ERROR");
    });
  });
});
