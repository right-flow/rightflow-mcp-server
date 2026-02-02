/**
 * RTL-Guard Utility Tests
 * Test-Driven Development for RTL transformations
 */

import { describe, it, expect } from 'vitest';
import {
  transformFlexDirection,
  transformPadding,
  transformMargin,
  transformTextAlign,
  transformPosition,
  calculateRTLCursorPosition,
  mirrorMouseDelta,
  convertToLogicalProperties,
  isRTLLanguage,
  getRTLDirection,
  RTLGuard
} from './rtl-guard';

describe('RTL-Guard Utility', () => {
  describe('Flexbox Direction Transformations', () => {
    it('should return flex-row-reverse for RTL with row direction', () => {
      expect(transformFlexDirection('row', 'rtl')).toBe('row-reverse');
    });

    it('should return flex-row for RTL with row-reverse direction', () => {
      expect(transformFlexDirection('row-reverse', 'rtl')).toBe('row');
    });

    it('should not change column directions for RTL', () => {
      expect(transformFlexDirection('column', 'rtl')).toBe('column');
      expect(transformFlexDirection('column-reverse', 'rtl')).toBe('column-reverse');
    });

    it('should not transform directions for LTR', () => {
      expect(transformFlexDirection('row', 'ltr')).toBe('row');
      expect(transformFlexDirection('row-reverse', 'ltr')).toBe('row-reverse');
    });
  });

  describe('Padding/Margin Transformations', () => {
    it('should swap padding-left and padding-right for RTL', () => {
      const styles = {
        paddingLeft: '10px',
        paddingRight: '20px',
        paddingTop: '5px'
      };
      const result = transformPadding(styles, 'rtl');
      expect(result.paddingLeft).toBe('20px');
      expect(result.paddingRight).toBe('10px');
      expect(result.paddingTop).toBe('5px');
    });

    it('should swap margin-left and margin-right for RTL', () => {
      const styles = {
        marginLeft: '15px',
        marginRight: '25px',
        marginBottom: '10px'
      };
      const result = transformMargin(styles, 'rtl');
      expect(result.marginLeft).toBe('25px');
      expect(result.marginRight).toBe('15px');
      expect(result.marginBottom).toBe('10px');
    });

    it('should handle auto values correctly', () => {
      const styles = {
        marginLeft: 'auto',
        marginRight: '0'
      };
      const result = transformMargin(styles, 'rtl');
      expect(result.marginLeft).toBe('0');
      expect(result.marginRight).toBe('auto');
    });
  });

  describe('Text Alignment', () => {
    it('should swap left and right text alignment for RTL', () => {
      expect(transformTextAlign('left', 'rtl')).toBe('right');
      expect(transformTextAlign('right', 'rtl')).toBe('left');
    });

    it('should keep center and justify unchanged', () => {
      expect(transformTextAlign('center', 'rtl')).toBe('center');
      expect(transformTextAlign('justify', 'rtl')).toBe('justify');
    });

    it('should use start/end for better RTL support', () => {
      expect(transformTextAlign('start', 'rtl')).toBe('start');
      expect(transformTextAlign('end', 'rtl')).toBe('end');
    });
  });

  describe('Position Transformations', () => {
    it('should swap left and right positions for RTL', () => {
      const position = {
        left: '10px',
        right: 'auto',
        top: '20px'
      };
      const result = transformPosition(position, 'rtl');
      expect(result.left).toBe('auto');
      expect(result.right).toBe('10px');
      expect(result.top).toBe('20px');
    });

    it('should handle percentage values', () => {
      const position = {
        left: '25%',
        right: '75%'
      };
      const result = transformPosition(position, 'rtl');
      expect(result.left).toBe('75%');
      expect(result.right).toBe('25%');
    });
  });

  describe('Cursor Position Calculation', () => {
    it('should calculate correct cursor position for RTL text', () => {
      const text = 'שלום עולם'; // Hebrew text
      const cursorIndex = 3;
      const containerWidth = 200;
      const result = calculateRTLCursorPosition(text, cursorIndex, containerWidth);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(containerWidth);
    });

    it('should handle mixed Hebrew-English text', () => {
      const text = 'Hello שלום World';
      const cursorIndex = 7;
      const containerWidth = 300;
      const result = calculateRTLCursorPosition(text, cursorIndex, containerWidth);
      expect(result).toBeDefined();
    });

    it('should return 0 for empty text', () => {
      expect(calculateRTLCursorPosition('', 0, 200)).toBe(0);
    });
  });

  describe('Mouse Delta Mirroring for DND', () => {
    it('should mirror horizontal mouse delta for RTL', () => {
      const delta = { x: 50, y: 30 };
      const result = mirrorMouseDelta(delta, 'rtl');
      expect(result.x).toBe(-50);
      expect(result.y).toBe(30);
    });

    it('should not mirror delta for LTR', () => {
      const delta = { x: 50, y: 30 };
      const result = mirrorMouseDelta(delta, 'ltr');
      expect(result.x).toBe(50);
      expect(result.y).toBe(30);
    });

    it('should handle negative deltas', () => {
      const delta = { x: -25, y: -15 };
      const result = mirrorMouseDelta(delta, 'rtl');
      expect(result.x).toBe(25);
      expect(result.y).toBe(-15);
    });
  });

  describe('Logical Properties Conversion', () => {
    it('should convert padding to logical properties', () => {
      const styles = {
        paddingLeft: '10px',
        paddingRight: '20px'
      };
      const result = convertToLogicalProperties(styles);
      expect(result.paddingInlineStart).toBe('10px');
      expect(result.paddingInlineEnd).toBe('20px');
      expect(result.paddingLeft).toBeUndefined();
      expect(result.paddingRight).toBeUndefined();
    });

    it('should convert margin to logical properties', () => {
      const styles = {
        marginLeft: 'auto',
        marginRight: '0'
      };
      const result = convertToLogicalProperties(styles);
      expect(result.marginInlineStart).toBe('auto');
      expect(result.marginInlineEnd).toBe('0');
    });

    it('should convert border to logical properties', () => {
      const styles = {
        borderLeft: '1px solid black',
        borderRight: '2px dotted red'
      };
      const result = convertToLogicalProperties(styles);
      expect(result.borderInlineStart).toBe('1px solid black');
      expect(result.borderInlineEnd).toBe('2px dotted red');
    });

    it('should handle text-align conversion', () => {
      const styles = {
        textAlign: 'left'
      };
      const result = convertToLogicalProperties(styles);
      expect(result.textAlign).toBe('start');
    });
  });

  describe('Language Detection', () => {
    it('should detect Hebrew as RTL', () => {
      expect(isRTLLanguage('שלום עולם')).toBe(true);
      expect(getRTLDirection('שלום')).toBe('rtl');
    });

    it('should detect Arabic as RTL', () => {
      expect(isRTLLanguage('مرحبا بالعالم')).toBe(true);
      expect(getRTLDirection('مرحبا')).toBe('rtl');
    });

    it('should detect English as LTR', () => {
      expect(isRTLLanguage('Hello World')).toBe(false);
      expect(getRTLDirection('Hello')).toBe('ltr');
    });

    it('should handle mixed text based on first strong character', () => {
      expect(isRTLLanguage('שלום Hello')).toBe(true); // Starts with Hebrew
      expect(isRTLLanguage('Hello שלום')).toBe(false); // Starts with English
    });

    it('should handle empty or undefined text', () => {
      expect(isRTLLanguage('')).toBe(false);
      expect(isRTLLanguage(undefined as any)).toBe(false);
      expect(getRTLDirection('')).toBe('ltr');
    });
  });

  describe('RTLGuard Class Integration', () => {
    it('should apply full RTL transformation to styles object', () => {
      const guard = new RTLGuard('rtl');
      const styles = {
        display: 'flex',
        flexDirection: 'row',
        paddingLeft: '10px',
        paddingRight: '20px',
        marginLeft: 'auto',
        textAlign: 'left'
      };

      const result = guard.transform(styles);
      expect(result.flexDirection).toBe('row-reverse');
      expect(result.paddingInlineStart).toBe('10px');
      expect(result.paddingInlineEnd).toBe('20px');
      expect(result.marginInlineStart).toBe('auto');
      expect(result.textAlign).toBe('start');
    });

    it('should not transform LTR styles', () => {
      const guard = new RTLGuard('ltr');
      const styles = {
        flexDirection: 'row',
        paddingLeft: '10px',
        textAlign: 'left'
      };

      const result = guard.transform(styles);
      expect(result.flexDirection).toBe('row');
      expect(result.paddingInlineStart).toBe('10px');
      expect(result.textAlign).toBe('start');
    });

    it('should handle className transformations', () => {
      const guard = new RTLGuard('rtl');
      expect(guard.getClassName('text-left')).toBe('text-right');
      expect(guard.getClassName('pl-4')).toBe('pr-4');
      expect(guard.getClassName('mr-auto')).toBe('ml-auto');
      expect(guard.getClassName('flex-row')).toBe('flex-row-reverse');
    });

    it('should provide utility methods', () => {
      const guard = new RTLGuard('rtl');
      expect(guard.isRTL()).toBe(true);
      expect(guard.getDirection()).toBe('rtl');
      expect(guard.getOppositeDirection()).toBe('ltr');
    });
  });
});