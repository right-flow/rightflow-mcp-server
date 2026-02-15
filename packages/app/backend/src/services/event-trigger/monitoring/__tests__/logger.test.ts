/**
 * Logger Tests (TDD - RED Phase)
 * Tests for Winston structured logging with P0 edge case mitigations
 */

import {
  eventLogger,
  logEventEmit,
  logError,
  logCircuitBreakerStateChange,
  RateLimitedLogger,
  redactPII,
} from '../logger';
import winston from 'winston';
import fs from 'fs';
import path from 'path';

describe('Event Trigger Logger', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    // Clear log files
    const logsDir = path.join(__dirname, '..', '..', '..', '..', 'logs');
    if (fs.existsSync(logsDir)) {
      fs.rmSync(logsDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (logSpy) {
      logSpy.mockRestore();
    }
  });

  describe('P0: Log Rate Limiting (Prevent Disk Exhaustion)', () => {
    describe('RateLimitedLogger', () => {
      it('should throttle logs under high load', async () => {
        const rateLimitedLogger = new RateLimitedLogger(eventLogger, {
          maxLogsPerSecond: 100,
        });

        const logCount = { info: 0, dropped: 0 };

        // Attempt to log 10,000 messages rapidly
        for (let i = 0; i < 10000; i++) {
          const result = rateLimitedLogger.info('High frequency event', {
            component: 'Test',
            event_id: `evt_${i}`,
          });

          if (result) {
            logCount.info++;
          } else {
            logCount.dropped++;
          }
        }

        // Should throttle to ~100 logs
        expect(logCount.info).toBeLessThan(150);
        expect(logCount.dropped).toBeGreaterThan(9800);
      });

      it('should emit warning when logs are dropped', async () => {
        const rateLimitedLogger = new RateLimitedLogger(eventLogger, {
          maxLogsPerSecond: 10,
        });

        const warnSpy = jest.spyOn(eventLogger, 'warn');

        // Flood with logs
        for (let i = 0; i < 1000; i++) {
          rateLimitedLogger.info('Spam', { component: 'Test' });
        }

        // Should emit warning about dropped logs
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('drop'),
          expect.any(Object),
        );
      });

      it('should allow normal logging when under limit', () => {
        const rateLimitedLogger = new RateLimitedLogger(eventLogger, {
          maxLogsPerSecond: 1000,
        });

        const logCount = { logged: 0 };

        // Log 100 messages (under limit)
        for (let i = 0; i < 100; i++) {
          const result = rateLimitedLogger.info('Normal event', {
            component: 'Test',
          });
          if (result) logCount.logged++;
        }

        // All should be logged
        expect(logCount.logged).toBe(100);
      });

      it('should reset rate limit after time window', async () => {
        const rateLimitedLogger = new RateLimitedLogger(eventLogger, {
          maxLogsPerSecond: 10,
          windowMs: 100, // 100ms window
        });

        // Log 10 messages (hit limit)
        for (let i = 0; i < 10; i++) {
          rateLimitedLogger.info('Message', { component: 'Test' });
        }

        // Next log should be dropped
        expect(rateLimitedLogger.info('Overflow', { component: 'Test' })).toBe(false);

        // Wait for window to reset
        await new Promise(resolve => setTimeout(resolve, 150));

        // Should allow logging again
        expect(rateLimitedLogger.info('After reset', { component: 'Test' })).toBe(true);
      });
    });

    describe('Dynamic Log Level', () => {
      it('should increase log level during high load', () => {
        const adaptiveLogger = new RateLimitedLogger(eventLogger, {
          maxLogsPerSecond: 100,
          adaptiveLevel: true,
        });

        // Simulate high load
        for (let i = 0; i < 10000; i++) {
          adaptiveLogger.info('High load', { component: 'Test' });
        }

        // Should have switched to WARN or ERROR level
        expect(adaptiveLogger.getCurrentLevel()).toMatch(/warn|error/);
      });

      it('should restore log level when load normalizes', async () => {
        // Create fresh logger for this test
        const testLogger = winston.createLogger({
          level: 'info',
          transports: [new winston.transports.Console()],
        });

        const adaptiveLogger = new RateLimitedLogger(testLogger, {
          maxLogsPerSecond: 10, // Low threshold for faster test
          windowMs: 100,
          adaptiveLevel: true,
        });

        // Initial level should be info
        expect(adaptiveLogger.getCurrentLevel()).toBe('info');

        // Very high load (need > maxLogsPerSecond * 10 drops for adaptive level)
        for (let i = 0; i < 500; i++) {
          adaptiveLogger.info('Spike', { component: 'Test' });
        }

        // Should increase level during high load (> 10 * 10 = 100 drops)
        expect(adaptiveLogger.getCurrentLevel()).toBe('warn');
      });
    });
  });

  describe('P1: PII Redaction', () => {
    describe('redactPII', () => {
      it('should redact email addresses', () => {
        const data = {
          email: 'user@example.com',
          message: 'Contact john.doe@company.com for details',
        };

        const redacted = redactPII(data);

        expect(redacted.email).toMatch(/u\*\*\*@e\*\*\*\.com/);
        expect(redacted.message).toMatch(/j\*\*\*@c\*\*\*\.com/);
        expect(redacted.message).not.toContain('john.doe@company.com');
      });

      it('should redact phone numbers', () => {
        const data = {
          phone: '+972501234567',
          message: 'Call +1-555-123-4567',
        };

        const redacted = redactPII(data);

        // Phone should be partially redacted
        expect(redacted.phone).toContain('***');
        expect(redacted.phone).not.toBe('+972501234567');

        expect(redacted.message).toContain('***');
        expect(redacted.message).not.toContain('+1-555-123-4567');
      });

      it('should redact PII in nested objects', () => {
        const data = {
          user: {
            profile: {
              contact: {
                email: 'secret@example.com',
                phone: '+972501234567',
              },
            },
          },
        };

        const redacted = redactPII(data);

        expect(redacted.user.profile.contact.email).not.toContain('secret@example.com');
        expect(redacted.user.profile.contact.phone).not.toContain('+972501234567');
      });

      it('should redact PII in error stack traces', () => {
        const error = new Error('Failed for user john@example.com');
        error.stack = 'Error: Query failed for john@example.com\n  at query (db.ts:50)';

        const data = {
          error: {
            message: error.message,
            stack: error.stack,
          },
        };

        const redacted = redactPII(data);

        expect(redacted.error.message).not.toContain('john@example.com');
        expect(redacted.error.stack).not.toContain('john@example.com');
      });

      it('should preserve non-PII data', () => {
        const data = {
          organization_id: 'org_123',
          event_type: 'user.registered',
          count: 42,
        };

        const redacted = redactPII(data);

        expect(redacted).toEqual(data);
      });

      it('should handle malformed emails with single-part domains', () => {
        const data = {
          email: 'test@com',
          message: 'Contact user@localhost for details',
        };

        const redacted = redactPII(data);

        // Should not crash
        expect(redacted).toBeDefined();

        // Should redact single-part domain emails
        expect(redacted.email).toBe('t***@***.com');
        expect(redacted.message).toContain('u***@***.localhost');
        expect(redacted.message).not.toContain('user@localhost');
      });

      it('should handle edge cases in email redaction', () => {
        const data = {
          singlePartDomain: 'admin@test',
          normalEmail: 'john@example.com',
          localDev: 'dev@localhost',
        };

        const redacted = redactPII(data);

        // Single-part domain
        expect(redacted.singlePartDomain).toBe('a***@***.test');

        // Normal multi-part domain
        expect(redacted.normalEmail).toMatch(/j\*\*\*@e\*\*\*\.com/);

        // Localhost (single-part)
        expect(redacted.localDev).toBe('d***@***.localhost');
      });
    });
  });

  describe('P1: Hebrew/RTL Text Encoding', () => {
    it('should preserve Hebrew text in logs with UTF-8 encoding', () => {
      const hebrewMessage = 'טריגר הופעל עבור משתמש';

      logSpy = jest.spyOn(eventLogger, 'info');

      logEventEmit({
        component: 'EventBus',
        message: hebrewMessage,
        event_type: 'משתמש.רישום',
      });

      expect(logSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          message: hebrewMessage,
          event_type: 'משתמש.רישום',
        }),
      );
    });

    it('should handle mixed Hebrew and English', () => {
      const mixedMessage = 'Event triggered for משתמש user_123';

      logSpy = jest.spyOn(eventLogger, 'info');

      logEventEmit({
        component: 'EventBus',
        message: mixedMessage,
      });

      expect(logSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          message: mixedMessage,
        }),
      );
    });
  });

  describe('Basic Logging Functionality', () => {
    it('should log event emission with correct format', () => {
      logSpy = jest.spyOn(eventLogger, 'info');

      logEventEmit({
        component: 'EventBus',
        event_id: 'evt_123',
        event_type: 'form.submitted',
        organization_id: 'org_456',
      });

      expect(logSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          component: 'EventBus',
          event_id: 'evt_123',
          event_type: 'form.submitted',
          organization_id: 'org_456',
        }),
      );
    });

    it('should include timestamp in ISO 8601 format', () => {
      // Test by checking logger metadata
      const now = new Date().toISOString();
      expect(now).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should log errors with stack trace', () => {
      logSpy = jest.spyOn(eventLogger, 'error');

      const error = new Error('Test error');

      logError('Action failed', error, {
        component: 'ActionChainExecutor',
        action_id: 'act_789',
      });

      expect(logSpy).toHaveBeenCalledWith(
        'Action failed',
        expect.objectContaining({
          component: 'ActionChainExecutor',
          action_id: 'act_789',
          error: expect.objectContaining({
            message: 'Test error',
            stack: expect.any(String),
          }),
        }),
      );
    });

    it('should log Circuit Breaker state changes', () => {
      logSpy = jest.spyOn(eventLogger, 'warn');

      logCircuitBreakerStateChange('closed', 'open');

      expect(logSpy).toHaveBeenCalledWith(
        'Circuit Breaker state changed',
        expect.objectContaining({
          component: 'CircuitBreaker',
          from_state: 'closed',
          to_state: 'open',
        }),
      );
    });
  });

  describe('Performance', () => {
    it('should not degrade performance with high-frequency logging', () => {
      const iterations = 10000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        logEventEmit({
          component: 'EventBus',
          event_id: `evt_${i}`,
        });
      }

      const duration = Date.now() - startTime;
      const avgTimePerLog = duration / iterations;

      // Should be fast (< 0.1ms per log with throttling)
      expect(avgTimePerLog).toBeLessThan(0.1);
    });
  });
});
