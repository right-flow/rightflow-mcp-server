/**
 * OpenTelemetry Tracing for Event Trigger System
 * Includes P1 mitigations for context propagation and span lifecycle
 */

import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { BatchSpanProcessor, Sampler, SamplingDecision } from '@opentelemetry/sdk-trace-base';
import { trace, Span, SpanStatusCode, context, Context } from '@opentelemetry/api';

let tracingInitialized = false;

/**
 * Custom Sampler: Always sample errors, 10% for success
 * P1 Mitigation: Prevents losing error traces while reducing overhead
 */
class AdaptiveSampler implements Sampler {
  shouldSample(
    ctx: Context,
    traceId: string,
    spanName: string,
    spanKind: number,
    attributes: any,
    links: any[]
  ) {
    // Always sample if span has error attribute
    if (attributes?.['error'] || attributes?.['exception']) {
      return {
        decision: SamplingDecision.RECORD_AND_SAMPLED,
        attributes,
      };
    }

    // Always sample critical operations
    const criticalOperations = ['event.emit', 'action.execute', 'trigger.match'];
    if (criticalOperations.some(op => spanName.includes(op))) {
      return {
        decision: SamplingDecision.RECORD_AND_SAMPLED,
        attributes,
      };
    }

    // Sample 10% of other operations
    const sampleRate = parseFloat(process.env.TRACING_SAMPLING_RATE || '0.1');
    const shouldSample = Math.random() < sampleRate;

    return {
      decision: shouldSample
        ? SamplingDecision.RECORD_AND_SAMPLED
        : SamplingDecision.NOT_RECORD,
      attributes,
    };
  }

  toString(): string {
    return 'AdaptiveSampler{errorAlways,critical100%,other10%}';
  }
}

/**
 * Initialize OpenTelemetry Tracing
 */
export function initializeTracing(): void {
  if (tracingInitialized) {
    return; // Already initialized
  }

  const resource = resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: 'event-trigger-system',
    [SEMRESATTRS_SERVICE_VERSION]: '1.0.0',
  });

  // Jaeger Exporter
  const jaegerExporter = new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  });

  // Batch Span Processor (batches spans before sending)
  const spanProcessor = new BatchSpanProcessor(jaegerExporter, {
    maxQueueSize: 2048,
    maxExportBatchSize: 512,
    scheduledDelayMillis: 5000,
  });

  const provider = new NodeTracerProvider({
    resource,
    sampler: new AdaptiveSampler(),
    spanProcessors: [spanProcessor], // Pass span processors array in constructor (new SDK API)
  });

  // Register provider globally
  provider.register();

  // Auto-instrumentation for HTTP and Express
  registerInstrumentations({
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
    ],
  });

  tracingInitialized = true;
  console.log('✅ OpenTelemetry tracing initialized');
}

/**
 * Get Event Trigger Tracer
 */
export function getTracer() {
  return trace.getTracer('event-trigger', '1.0.0');
}

/**
 * P1 Mitigation: Context Propagation Helper
 * Ensures trace context is preserved across async operations
 */
export async function withContext<T>(
  span: Span,
  fn: () => Promise<T>
): Promise<T> {
  // Set span in context
  const ctx = trace.setSpan(context.active(), span);

  // Execute function within context
  return await context.with(ctx, fn);
}

/**
 * Create span for event emission
 */
export function createEventEmitSpan(
  eventId: string,
  eventType: string,
  organizationId: string
): Span {
  const tracer = getTracer();
  const span = tracer.startSpan('event.emit', {
    attributes: {
      'event.id': eventId,
      'event.type': eventType,
      'organization.id': organizationId,
    },
  });

  return span;
}

/**
 * Create span for action execution
 */
export function createActionExecuteSpan(
  actionId: string,
  actionType: string,
  triggerId: string,
  parentSpan?: Span
): Span {
  const tracer = getTracer();

  // Create context with parent span if provided
  const parentContext = parentSpan
    ? trace.setSpan(context.active(), parentSpan)
    : context.active();

  const span = tracer.startSpan(
    'action.execute',
    {
      attributes: {
        'action.id': actionId,
        'action.type': actionType,
        'trigger.id': triggerId,
      },
    },
    parentContext
  );

  return span;
}

/**
 * Record exception in span
 */
export function recordSpanException(span: Span, error: Error): void {
  span.recordException(error);
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error.message,
  });

  // Mark span with error attribute for adaptive sampling
  span.setAttribute('error', true);
  span.setAttribute('exception', true);
}

/**
 * Set span success status
 */
export function setSpanSuccess(span: Span): void {
  span.setStatus({ code: SpanStatusCode.OK });
}

/**
 * End span (with safety check)
 */
export function endSpan(span: Span): void {
  try {
    span.end();
  } catch (error) {
    // Span already ended or invalid - ignore
    console.warn('Failed to end span:', error);
  }
}

/**
 * P1 Mitigation: Instrument async function with automatic span lifecycle
 * Ensures spans are always ended, even on error
 */
export async function instrumentAsync<T>(
  spanName: string,
  attributes: Record<string, string | number | boolean>,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  const tracer = getTracer();
  const span = tracer.startSpan(spanName, { attributes });

  try {
    const result = await withContext(span, async () => await fn(span));
    setSpanSuccess(span);
    return result;
  } catch (error) {
    recordSpanException(span, error as Error);
    throw error;
  } finally {
    endSpan(span);
  }
}

/**
 * P1 Mitigation: Truncate large trace attributes
 * Prevents Jaeger rejection due to payload size
 */
export function truncateAttribute(value: any, maxLength: number = 10000): any {
  if (typeof value === 'string' && value.length > maxLength) {
    return value.substring(0, maxLength) + '... [truncated]';
  }

  if (typeof value === 'object' && value !== null) {
    const jsonStr = JSON.stringify(value);
    if (jsonStr.length > maxLength) {
      return '[object too large - truncated]';
    }
  }

  return value;
}

/**
 * Set span attributes with size limit
 */
export function setSpanAttributes(
  span: Span,
  attributes: Record<string, any>
): void {
  const truncatedAttributes: Record<string, any> = {};

  for (const [key, value] of Object.entries(attributes)) {
    truncatedAttributes[key] = truncateAttribute(value);
  }

  span.setAttributes(truncatedAttributes);
}
