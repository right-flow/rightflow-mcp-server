import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDebouncedDetector, detectLanguage } from '@/utils/language-detection';

describe('createDebouncedDetector()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('TC-ML-015: Rapid typing should only fire once', async () => {
    let callCount = 0;
    const detector = createDebouncedDetector(() => callCount++, 500);

    detector("ש");
    detector("של");
    detector("שלו");
    detector("שלום");

    // Before delay: no calls
    expect(callCount).toBe(0);

    // After delay: exactly 1 call
    vi.advanceTimersByTime(600);
    expect(callCount).toBe(1);
  });

  test('TC-ML-016: Large paste should detect without blocking (<10ms)', () => {
    const largeText = "שלום ".repeat(2000); // ~10KB
    const start = performance.now();
    const result = detectLanguage(largeText);
    const duration = performance.now() - start;

    expect(result).toBe('he');
    expect(duration).toBeLessThan(10);
  });

  test('Should cancel previous detection when new text arrives', () => {
    const callback = vi.fn();
    const detector = createDebouncedDetector(callback, 500);

    detector("שלום");
    vi.advanceTimersByTime(300); // 300ms (not enough for trigger)

    detector("Hello"); // New text, should cancel previous

    vi.advanceTimersByTime(600); // Complete the delay

    // Should only fire once with latest text (English)
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('en');
  });

  test('Should not fire callback if detected language is null', () => {
    const callback = vi.fn();
    const detector = createDebouncedDetector(callback, 500);

    detector("123 456"); // Numbers only, should return null

    vi.advanceTimersByTime(600);

    expect(callback).not.toHaveBeenCalled();
  });
});
