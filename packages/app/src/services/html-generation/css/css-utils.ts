/**
 * CSS Utility Functions
 * Shared helpers for CSS generation
 */

/**
 * Spacing values based on theme spacing option
 */
export interface SpacingValues {
  padding: string;
  gap: string;
  margin: string;
}

/**
 * Style-specific variations
 */
export interface StyleVariations {
  borderRadius: string;
  boxShadow: string;
  inputBg: string;
  legendStyle: string;
}

/**
 * Gets spacing values based on theme spacing
 */
export function getSpacingValues(
  spacing: 'compact' | 'normal' | 'spacious',
): SpacingValues {
  const spacingValues = {
    compact: { padding: '15px', gap: '10px', margin: '15px' },
    normal: { padding: '20px', gap: '15px', margin: '25px' },
    spacious: { padding: '30px', gap: '20px', margin: '35px' },
  };

  return spacingValues[spacing];
}

/**
 * Gets style-specific variations
 */
export function getStyleVariations(
  style: 'modern' | 'classic' | 'minimal',
  primaryColor: string,
): StyleVariations {
  const styleVariations = {
    modern: {
      borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      inputBg: '#fafafa',
      legendStyle: `background: linear-gradient(135deg, ${primaryColor}, ${adjustColor(primaryColor, -20)});`,
    },
    classic: {
      borderRadius: '0',
      boxShadow: '0 0 15px rgba(0,0,0,0.1)',
      inputBg: '#fcfcfc',
      legendStyle: `background: ${primaryColor};`,
    },
    minimal: {
      borderRadius: '4px',
      boxShadow: 'none',
      inputBg: '#fff',
      legendStyle: `background: transparent; color: ${primaryColor}; border-bottom: 2px solid ${primaryColor};`,
    },
  };

  return styleVariations[style];
}

/**
 * Adjusts a hex color by a percentage
 * Positive = lighter, Negative = darker
 */
export function adjustColor(hex: string, percent: number): string {
  // Remove # if present
  const color = hex.replace('#', '');

  // Parse RGB
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  // Adjust
  const adjust = (value: number) => {
    const adjusted = Math.round(value + (value * percent) / 100);
    return Math.min(255, Math.max(0, adjusted));
  };

  // Convert back to hex
  const toHex = (value: number) => value.toString(16).padStart(2, '0');

  return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
}
