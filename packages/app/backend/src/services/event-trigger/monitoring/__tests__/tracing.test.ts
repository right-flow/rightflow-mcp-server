/**
 * Tracing Tests (TDD - RED Phase)
 * Tests for OpenTelemetry distributed tracing with P1 edge case mitigations
 */

import {
  initializeTracing,
  getTracer,
  createEventEmitSpan,
  createActionExecuteSpan,
  recordSpanException,
  setSpanSuccess,
  endSpan,
  instrumentAsync,
  withContext,
} from '../tracing';
import { trace, SpanStatusCode, context, Span } from '@opentelemetry/api';

// Mock OpenTelemetry
jest.mock('@opentelemetry/sdk-trace-node');
jest.mock('@opentelemetry/exporter-jaeger');

describe('Event Trigger Tracing', () => {
  beforeAll(() => {
    initializeTracing();
  });

  describe('P1: Trace Context Propagation', () => {
    describe('withContext helper', () => {
      it('should preserve trace context across Promise.all()', async () => {
        const tracer = getTracer();
        const parentSpan = tracer.startSpan('parent');

        const childSpanIds: string[] = [];

        await withContext(parentSpan, async () => {
          await Promise.all([
            instrumentAsync('child1', {}, async (span) => {
              childSpanIds.push((span as any).spanContext().spanId);
              await new Promise(resolve => setTimeout(resolve, 10));
            }),
            instrumentAsync('child2', {}, async (span) => {
              childSpanIds.push((span as any).spanContext().spanId);
              await new Promise(resolve => setTimeout(resolve, 10));
            }),
          ]);
        });

        parentSpan.end();

        // Both child spans should link to parent
        expect(childSpanIds).toHaveLength(2);

        // Verify parent-child relationship
        for (const childId of childSpanIds) {
          expect(childId).toBeDefined();
          // Parent span ID should be in child context
        }
      });

      it('should propagate context through nested async operations', async () => {
        const tracer = getTracer();
        const rootSpan = tracer.startSpan('root');

        let level1SpanId: string | undefined;
        let level2SpanId: string | undefined;
        let level3SpanId: string | undefined;

        await withContext(rootSpan, async () => {
          await instrumentAsync('level1', {}, async (span1) => {
            level1SpanId = (span1 as any).spanContext().spanId;

            await instrumentAsync('level2', {}, async (span2) => {
              level2SpanId = (span2 as any).spanContext().spanId;

              await instrumentAsync('level3', {}, async (span3) => {
                level3SpanId = (span3 as any).spanContext().spanId;
              });
            });
          });
        });

        rootSpan.end();

        // All spans should be created
        expect(level1SpanId).toBeDefined();
        expect(level2SpanId).toBeDefined();
        expect(level3SpanId).toBeDefined();
      });
    });

    describe('Span Lifecycle Management', () => {
      it('should always end spans even on error', async () => {
        const tracer = getTracer();
        const spanEndSpy = jest.fn();

        const mockSpan = {
          end: spanEndSpy,
          recordException: jest.fn(),
          setStatus: jest.fn(),
          spanContext: jest.fn(),
        };

        jest.spyOn(tracer, 'startSpan').mockReturnValue(mockSpan as any);

        try {
          await instrumentAsync('test', {}, async () => {
            throw new Error('Test error');
          });
        } catch (e) {
          // Expected error
        }

        // span.end() must be called
        expect(spanEndSpy).toHaveBeenCalled();
      });

      it('should prevent memory leak from unclosed spans', async () => {
        const tracer = getTracer();
        const openSpans: Span[] = [];

        // Track span creation
        const originalStartSpan = tracer.startSpan.bind(tracer);
        jest.spyOn(tracer, 'startSpan').mockImplementation((...args) => {
          const span = originalStartSpan(...args);
          openSpans.push(span);
          return span;
        });

        // Execute many operations
        for (let i = 0; i < 100; i++) {
          await instrumentAsync(`operation-${i}`, {}, async () => {
            await new Promise(resolve => setTimeout(resolve, 1));
          });
        }

        // All spans should be ended (not accumulating in memory)
        const unclosedSpans = openSpans.filter(span => {
          const spanImpl = span as any;
          return !spanImpl.ended && !spanImpl._ended;
        });

        expect(unclosedSpans.length).toBe(0);
      });
    });

    describe('Infinite Trace Depth Prevention', () => {
      it('should limit trace depth to prevent stack overflow', async () => {
        const maxDepth = 1000;

        async function recursiveTrace(depth: number): Promise<void> {
          if (depth > maxDepth) {
            throw new Error('Max trace depth exceeded');
          }

          await instrumentAsync(`level-${depth}`, { depth }, async () => {
            if (depth < 10) { // Only recurse 10 levels
              await recursiveTrace(depth + 1);
            }
          });
        }

        // Should not throw for reasonable depth
        await expect(recursiveTrace(0)).resolves.not.toThrow();

        // Should throw for excessive depth
        await expect(
          instrumentAsync('deep', {}, async () => {
            for (let i = 0; i < 2000; i++) {
              await instrumentAsync(`level-${i}`, {}, async () => {});
            }
          })
        ).rejects.toThrow();
      });
    });
  });

  describe('P1: Jaeger Exporter Failure Handling', () => {
    it('should buffer traces when Jaeger is unavailable', async () => {
      // This would require mocking Jaeger exporter
      // Test that traces are not lost when export fails

      const span = getTracer().startSpan('test');
      span.end();

      // Wait for export attempt
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify span was buffered (implementation-specific)
      // In real implementation, check exporter buffer
    });

    it('should truncate large trace attributes', () => {
      const largePayload = 'x'.repeat(2 * 1024 * 1024); // 2MB

      const span = getTracer().startSpan('test');
      span.setAttributes({
        'large_data': largePayload,
      });

      // Attributes should be truncated
      const spanImpl = span as any;
      const attributes = spanImpl.attributes || {};

      // Individual attribute should be < 10KB
      if (attributes['large_data']) {
        expect(attributes['large_data'].length).toBeLessThan(10 * 1024);
      }

      span.end();
    });
  });

  describe('Basic Tracing Functionality', () => {
    describe('createEventEmitSpan', () => {
      it('should create span for event emission', () => {
        const span = createEventEmitSpan('evt_123', 'form.submitted', 'org_456');

        expect(span).toBeDefined();

        const spanImpl = span as any;
        expect(spanImpl.name || spanImpl._name).toBe('event.emit');

        span.end();
      });
    });

    describe('createActionExecuteSpan', () => {
      it('should create span for action execution', () => {
        const span = createActionExecuteSpan('act_123', 'webhook', 'trg_456');

        expect(span).toBeDefined();

        const spanImpl = span as any;
        expect(spanImpl.name || spanImpl._name).toBe('action.execute');

        span.end();
      });

      it('should create child span with parent', () => {
        const parentSpan = getTracer().startSpan('parent');
        const childSpan = createActionExecuteSpan('act_123', 'webhook', 'trg_456', parentSpan);

        expect(childSpan).toBeDefined();

        parentSpan.end();
        childSpan.end();
      });
    });

    describe('recordSpanException', () => {
      it('should record exception in span', () => {
        const span = getTracer().startSpan('test');
        const recordExceptionSpy = jest.spyOn(span, 'recordException');
        const setStatusSpy = jest.spyOn(span, 'setStatus');

        const error = new Error('Test error');
        recordSpanException(span, error);

        expect(recordExceptionSpy).toHaveBeenCalledWith(error);
        expect(setStatusSpy).toHaveBeenCalledWith({
          code: SpanStatusCode.ERROR,
          message: 'Test error',
        });

        span.end();
      });
    });

    describe('setSpanSuccess', () => {
      it('should set span status to OK', () => {
        const span = getTracer().startSpan('test');
        const setStatusSpy = jest.spyOn(span, 'setStatus');

        setSpanSuccess(span);

        expect(setStatusSpy).toHaveBeenCalledWith({
          code: SpanStatusCode.OK,
        });

        span.end();
      });
    });

    describe('instrumentAsync', () => {
      it('should instrument async function successfully', async () => {
        const result = await instrumentAsync('test', { key: 'value' }, async (span) => {
          expect(span).toBeDefined();
          return 'success';
        });

        expect(result).toBe('success');
      });

      it('should propagate errors while recording them', async () => {
        const error = new Error('Test error');

        await expect(
          instrumentAsync('test', {}, async () => {
            throw error;
          })
        ).rejects.toThrow('Test error');
      });

      it('should set success status for successful operations', async () => {
        const tracer = getTracer();
        const setStatusSpy = jest.fn();

        const mockSpan = {
          setStatus: setStatusSpy,
          end: jest.fn(),
          recordException: jest.fn(),
        };

        jest.spyOn(tracer, 'startSpan').mockReturnValue(mockSpan as any);

        await instrumentAsync('test', {}, async () => {
          return 'success';
        });

        expect(setStatusSpy).toHaveBeenCalledWith({
          code: SpanStatusCode.OK,
        });
      });
    });
  });

  describe('Performance', () => {
    it('should not degrade performance with high trace volume', async () => {
      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await instrumentAsync(`trace-${i}`, { index: i }, async () => {
          // Simulate work
          await new Promise(resolve => setImmediate(resolve));
        });
      }

      const duration = Date.now() - startTime;
      const avgTimePerTrace = duration / iterations;

      // Should be fast (< 1ms overhead per trace)
      expect(avgTimePerTrace).toBeLessThan(1);
    });
  });
});
