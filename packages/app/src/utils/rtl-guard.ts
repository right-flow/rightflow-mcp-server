/**
 * RTL-Guard Utility
 * Comprehensive RTL transformation engine for Hebrew/Arabic UI support
 *
 * This utility provides automatic RTL transformations for:
 * - CSS styles and properties
 * - Flexbox directions
 * - Cursor positioning
 * - Mouse interactions (DND)
 * - Logical properties conversion
 */

export type Direction = 'ltr' | 'rtl';

interface StyleObject {
  [key: string]: string | number | undefined;
}

interface MouseDelta {
  x: number;
  y: number;
}

/**
 * Transform flexbox direction based on text direction
 */
export function transformFlexDirection(direction: string, textDir: Direction): string {
  if (textDir !== 'rtl') return direction;

  const transformations: Record<string, string> = {
    'row': 'row-reverse',
    'row-reverse': 'row',
  };

  return transformations[direction] || direction;
}

/**
 * Transform padding values for RTL
 */
export function transformPadding(styles: StyleObject, textDir: Direction): StyleObject {
  if (textDir !== 'rtl') return styles;

  const result = { ...styles };
  const tempLeft = result.paddingLeft;

  if ('paddingLeft' in result || 'paddingRight' in result) {
    result.paddingLeft = result.paddingRight;
    result.paddingRight = tempLeft;
  }

  return result;
}

/**
 * Transform margin values for RTL
 */
export function transformMargin(styles: StyleObject, textDir: Direction): StyleObject {
  if (textDir !== 'rtl') return styles;

  const result = { ...styles };
  const tempLeft = result.marginLeft;

  if ('marginLeft' in result || 'marginRight' in result) {
    result.marginLeft = result.marginRight;
    result.marginRight = tempLeft;
  }

  return result;
}

/**
 * Transform text alignment for RTL
 */
export function transformTextAlign(align: string, textDir: Direction): string {
  if (textDir !== 'rtl') return align;

  const transformations: Record<string, string> = {
    'left': 'right',
    'right': 'left',
  };

  return transformations[align] || align;
}

/**
 * Transform position properties for RTL
 */
export function transformPosition(position: StyleObject, textDir: Direction): StyleObject {
  if (textDir !== 'rtl') return position;

  const result = { ...position };
  const tempLeft = result.left;

  if ('left' in result || 'right' in result) {
    result.left = result.right;
    result.right = tempLeft;
  }

  return result;
}

/**
 * Calculate cursor position for RTL text
 * This is a simplified version - in production, you'd use Canvas measureText
 */
export function calculateRTLCursorPosition(
  text: string,
  cursorIndex: number,
  containerWidth: number
): number {
  if (!text || text.length === 0) return 0;

  // Simplified calculation - in reality, this would need font metrics
  const charWidth = containerWidth / (text.length + 1);

  // For RTL, cursor position is calculated from right
  if (isRTLLanguage(text)) {
    return containerWidth - (cursorIndex * charWidth);
  }

  // For LTR or mixed, calculate from left
  return cursorIndex * charWidth;
}

/**
 * Mirror mouse delta for RTL drag and drop
 */
export function mirrorMouseDelta(delta: MouseDelta, textDir: Direction): MouseDelta {
  if (textDir !== 'rtl') return delta;

  return {
    x: -delta.x,
    y: delta.y
  };
}

/**
 * Convert physical properties to logical properties
 * Logical properties work automatically with RTL/LTR
 */
export function convertToLogicalProperties(styles: StyleObject): StyleObject {
  const result: StyleObject = { ...styles };

  // Padding conversions
  if ('paddingLeft' in result) {
    result.paddingInlineStart = result.paddingLeft;
    delete result.paddingLeft;
  }
  if ('paddingRight' in result) {
    result.paddingInlineEnd = result.paddingRight;
    delete result.paddingRight;
  }

  // Margin conversions
  if ('marginLeft' in result) {
    result.marginInlineStart = result.marginLeft;
    delete result.marginLeft;
  }
  if ('marginRight' in result) {
    result.marginInlineEnd = result.marginRight;
    delete result.marginRight;
  }

  // Border conversions
  if ('borderLeft' in result) {
    result.borderInlineStart = result.borderLeft;
    delete result.borderLeft;
  }
  if ('borderRight' in result) {
    result.borderInlineEnd = result.borderRight;
    delete result.borderRight;
  }

  // Text align conversion
  if (result.textAlign === 'left') {
    result.textAlign = 'start';
  } else if (result.textAlign === 'right') {
    result.textAlign = 'end';
  }

  return result;
}

/**
 * Detect if text contains RTL characters
 */
export function isRTLLanguage(text: string): boolean {
  if (!text || typeof text !== 'string') return false;

  // Hebrew and Arabic Unicode ranges
  const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F]/;

  // Check first strong directional character
  for (const char of text) {
    if (rtlRegex.test(char)) return true;
    if (/[A-Za-z]/.test(char)) return false;
  }

  return false;
}

/**
 * Get text direction based on content
 */
export function getRTLDirection(text: string): Direction {
  return isRTLLanguage(text) ? 'rtl' : 'ltr';
}

/**
 * RTLGuard Class - Main integration point
 */
export class RTLGuard {
  private direction: Direction;

  constructor(direction: Direction = 'ltr') {
    this.direction = direction;
  }

  /**
   * Transform a complete styles object
   */
  transform(styles: StyleObject): StyleObject {
    let result = { ...styles };

    // Apply flexbox transformations
    if (result.flexDirection) {
      result.flexDirection = transformFlexDirection(
        result.flexDirection as string,
        this.direction
      );
    }

    // Convert to logical properties (handles padding, margin, border, text-align)
    result = convertToLogicalProperties(result);

    return result;
  }

  /**
   * Transform Tailwind/CSS class names
   */
  getClassName(className: string): string {
    if (this.direction !== 'rtl') return className;

    const classTransformations: Record<string, string> = {
      'text-left': 'text-right',
      'text-right': 'text-left',
      'pl-4': 'pr-4',
      'pr-4': 'pl-4',
      'ml-auto': 'mr-auto',
      'mr-auto': 'ml-auto',
      'flex-row': 'flex-row-reverse',
      'flex-row-reverse': 'flex-row',
      'rounded-l': 'rounded-r',
      'rounded-r': 'rounded-l',
      'border-l': 'border-r',
      'border-r': 'border-l',
      'left-0': 'right-0',
      'right-0': 'left-0',
    };

    // Check each transformation
    for (const [pattern, replacement] of Object.entries(classTransformations)) {
      if (className.includes(pattern)) {
        return className.replace(pattern, replacement);
      }
    }

    return className;
  }

  /**
   * Utility methods
   */
  isRTL(): boolean {
    return this.direction === 'rtl';
  }

  getDirection(): Direction {
    return this.direction;
  }

  getOppositeDirection(): Direction {
    return this.direction === 'rtl' ? 'ltr' : 'rtl';
  }

  setDirection(direction: Direction): void {
    this.direction = direction;
  }

  /**
   * Transform mouse coordinates for RTL
   */
  transformMouseCoordinates(x: number, containerWidth: number): number {
    if (!this.isRTL()) return x;
    return containerWidth - x;
  }

  /**
   * Get start/end values based on direction
   */
  getStartEnd(): { start: 'left' | 'right'; end: 'left' | 'right' } {
    return this.isRTL()
      ? { start: 'right', end: 'left' }
      : { start: 'left', end: 'right' };
  }
}

/**
 * Default export - singleton instance for global use
 */
export default new RTLGuard();