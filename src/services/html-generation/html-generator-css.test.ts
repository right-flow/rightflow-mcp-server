import { describe, it, expect } from 'vitest';
import { generateRightFlowCSS, generateFormJS } from './html-generator-css';

describe('html-generator-css', () => {
  describe('generateRightFlowCSS', () => {
    const defaultTheme = {
      primaryColor: '#003399',
      fontFamily: "'Segoe UI', Tahoma, sans-serif",
      spacing: 'normal' as const,
      style: 'modern' as const,
    };

    it('should generate valid CSS', () => {
      const css = generateRightFlowCSS(true, defaultTheme);

      expect(css).toContain(':root');
      expect(css).toContain('body');
      expect(css).toContain('.container');
    });

    it('should set RTL direction when rtl is true', () => {
      const css = generateRightFlowCSS(true, defaultTheme);

      expect(css).toContain('direction: rtl');
    });

    it('should set LTR direction when rtl is false', () => {
      const css = generateRightFlowCSS(false, defaultTheme);

      expect(css).toContain('direction: ltr');
    });

    it('should include the primary color', () => {
      const css = generateRightFlowCSS(true, {
        ...defaultTheme,
        primaryColor: '#ff5500',
      });

      expect(css).toContain('#ff5500');
    });

    it('should include the font family', () => {
      const css = generateRightFlowCSS(true, {
        ...defaultTheme,
        fontFamily: 'Arial, sans-serif',
      });

      expect(css).toContain('Arial, sans-serif');
    });

    it('should apply compact spacing', () => {
      const css = generateRightFlowCSS(true, {
        ...defaultTheme,
        spacing: 'compact',
      });

      expect(css).toContain('15px'); // compact padding
      expect(css).toContain('10px'); // compact gap
    });

    it('should apply spacious spacing', () => {
      const css = generateRightFlowCSS(true, {
        ...defaultTheme,
        spacing: 'spacious',
      });

      expect(css).toContain('30px'); // spacious padding
      expect(css).toContain('20px'); // spacious gap
    });

    it('should apply modern style with rounded corners', () => {
      const css = generateRightFlowCSS(true, {
        ...defaultTheme,
        style: 'modern',
      });

      expect(css).toContain('8px'); // border-radius
      expect(css).toContain('box-shadow');
    });

    it('should apply classic style with no rounded corners', () => {
      const css = generateRightFlowCSS(true, {
        ...defaultTheme,
        style: 'classic',
      });

      expect(css).toContain('border-radius: 0');
    });

    it('should apply minimal style', () => {
      const css = generateRightFlowCSS(true, {
        ...defaultTheme,
        style: 'minimal',
      });

      expect(css).toContain('box-shadow: none');
    });

    it('should include responsive media queries', () => {
      const css = generateRightFlowCSS(true, defaultTheme);

      expect(css).toContain('@media (max-width: 768px)');
      expect(css).toContain('@media (max-width: 480px)');
    });

    it('should include print styles', () => {
      const css = generateRightFlowCSS(true, defaultTheme);

      expect(css).toContain('@media print');
    });

    it('should include form element styles', () => {
      const css = generateRightFlowCSS(true, defaultTheme);

      expect(css).toContain('input[type="text"]');
      expect(css).toContain('select');
      expect(css).toContain('textarea');
      expect(css).toContain('fieldset');
      expect(css).toContain('legend');
    });

    it('should include checkbox and radio styles', () => {
      const css = generateRightFlowCSS(true, defaultTheme);

      expect(css).toContain('.checkbox-item');
      expect(css).toContain('.radio-group');
    });

    it('should include submit button styles', () => {
      const css = generateRightFlowCSS(true, defaultTheme);

      expect(css).toContain('button[type="submit"]');
      expect(css).toContain('.btn-submit');
    });

    it('should include signature box styles', () => {
      const css = generateRightFlowCSS(true, defaultTheme);

      expect(css).toContain('.signature-box');
    });

    it('should include signature pad container styles', () => {
      const css = generateRightFlowCSS(true, defaultTheme);

      expect(css).toContain('.signature-pad-container');
      expect(css).toContain('.signature-canvas');
      expect(css).toContain('.signature-controls');
      expect(css).toContain('.signature-clear-btn');
    });

    it('should include signature canvas interaction styles', () => {
      const css = generateRightFlowCSS(true, defaultTheme);

      expect(css).toContain('.signature-canvas.signing');
      expect(css).toContain('.signature-canvas.has-signature');
      expect(css).toContain('cursor: crosshair');
    });

    it('should include welcome page styles', () => {
      const css = generateRightFlowCSS(true, defaultTheme);

      expect(css).toContain('.welcome-page');
      expect(css).toContain('.welcome-section-title');
      expect(css).toContain('.welcome-text');
      expect(css).toContain('.welcome-info-box');
      expect(css).toContain('.welcome-documents-list');
      expect(css).toContain('.welcome-company-name');
    });

    it('should apply RTL border for welcome elements when rtl is true', () => {
      const css = generateRightFlowCSS(true, defaultTheme);

      expect(css).toContain('border-right');
      expect(css).toContain('padding-right');
    });

    it('should apply LTR border for welcome elements when rtl is false', () => {
      const css = generateRightFlowCSS(false, defaultTheme);

      expect(css).toContain('border-left');
      expect(css).toContain('padding-left');
    });

    it('should include validation styles', () => {
      const css = generateRightFlowCSS(true, defaultTheme);

      expect(css).toContain('.field-validation');
    });

    it('should include focus states', () => {
      const css = generateRightFlowCSS(true, defaultTheme);

      expect(css).toContain(':focus');
      expect(css).toContain('outline');
    });
  });

  describe('generateFormJS', () => {
    it('should generate valid JavaScript', () => {
      const js = generateFormJS('myForm', true);

      expect(js).toContain('getElementById');
      expect(js).toContain('addEventListener');
    });

    it('should use the provided form ID', () => {
      const js = generateFormJS('customFormId', true);

      expect(js).toContain("getElementById('customFormId')");
    });

    it('should include form submission handler', () => {
      const js = generateFormJS('myForm', true);

      expect(js).toContain('submit');
      expect(js).toContain('preventDefault');
    });

    it('should include validation logic', () => {
      const js = generateFormJS('myForm', true);

      expect(js).toContain('[required]');
      expect(js).toContain('isValid');
    });

    it('should use Hebrew messages for RTL forms', () => {
      const js = generateFormJS('myForm', true);

      expect(js).toContain('שדה חובה');
      expect(js).toContain('הטופס נשלח בהצלחה');
    });

    it('should use English messages for LTR forms', () => {
      const js = generateFormJS('myForm', false);

      expect(js).toContain('Required field');
      expect(js).toContain('Form submitted successfully');
    });

    it('should include input event listener for clearing validation', () => {
      const js = generateFormJS('myForm', true);

      expect(js).toContain("addEventListener('input'");
    });

    it('should be wrapped in IIFE for scope isolation', () => {
      const js = generateFormJS('myForm', true);

      expect(js).toContain('(function()');
      expect(js).toContain("'use strict'");
      expect(js).toContain('})()');
    });

    // Welcome page tests
    describe('welcome page support', () => {
      it('should include welcome page handling when includeWelcome is true', () => {
        const js = generateFormJS('myForm', true, 2, true);

        expect(js).toContain('includeWelcome = true');
        expect(js).toContain("return 'welcome'");
      });

      it('should not include welcome page handling when includeWelcome is false', () => {
        const js = generateFormJS('myForm', true, 2, false);

        expect(js).toContain('includeWelcome = false');
      });

      it('should calculate total tabs correctly with welcome page', () => {
        const js = generateFormJS('myForm', true, 3, true);

        // 3 form pages + 1 welcome = 4 tabs
        expect(js).toContain('totalTabs = 4');
      });

      it('should calculate total tabs correctly without welcome page', () => {
        const js = generateFormJS('myForm', true, 3, false);

        // 3 form pages, no welcome
        expect(js).toContain('totalTabs = 3');
      });

      it('should include getPageId function for welcome page mapping', () => {
        const js = generateFormJS('myForm', true, 2, true);

        expect(js).toContain('function getPageId(tabIndex)');
        expect(js).toContain("return 'welcome'");
      });

      it('should skip welcome page validation', () => {
        const js = generateFormJS('myForm', true, 2, true);

        expect(js).toContain('isWelcomePage()');
        expect(js).toContain('if (isWelcomePage()) return true');
      });
    });

    // Signature pad tests
    describe('signature pad support', () => {
      it('should include signature pad initialization', () => {
        const js = generateFormJS('myForm', true);

        expect(js).toContain('signaturePads');
        expect(js).toContain('.signature-canvas');
      });

      it('should include signature drawing functions', () => {
        const js = generateFormJS('myForm', true);

        expect(js).toContain('startDrawing');
        expect(js).toContain('stopDrawing');
        expect(js).toContain('function draw(e)');
      });

      it('should include signature save functionality', () => {
        const js = generateFormJS('myForm', true);

        expect(js).toContain('saveSignature');
        expect(js).toContain('toDataURL');
        expect(js).toContain("'image/png'");
      });

      it('should include signature clear functionality', () => {
        const js = generateFormJS('myForm', true);

        expect(js).toContain('clearSignature');
        expect(js).toContain('clearRect');
      });

      it('should include mouse event listeners for signature', () => {
        const js = generateFormJS('myForm', true);

        expect(js).toContain("'mousedown'");
        expect(js).toContain("'mousemove'");
        expect(js).toContain("'mouseup'");
        expect(js).toContain("'mouseleave'");
      });

      it('should include touch event listeners for signature', () => {
        const js = generateFormJS('myForm', true);

        expect(js).toContain("'touchstart'");
        expect(js).toContain("'touchmove'");
        expect(js).toContain("'touchend'");
        expect(js).toContain("'touchcancel'");
      });

      it('should expose signature pads globally', () => {
        const js = generateFormJS('myForm', true);

        expect(js).toContain('window.formSignaturePads');
      });

      it('should handle canvas resize', () => {
        const js = generateFormJS('myForm', true);

        expect(js).toContain('resizeCanvas');
        expect(js).toContain("addEventListener('resize'");
      });

      it('should include devicePixelRatio handling', () => {
        const js = generateFormJS('myForm', true);

        expect(js).toContain('devicePixelRatio');
      });
    });

    // Multi-page navigation tests
    describe('multi-page navigation', () => {
      it('should include tab navigation functions', () => {
        const js = generateFormJS('myForm', true, 3, true);

        expect(js).toContain('showTab');
        expect(js).toContain('goToTab');
        expect(js).toContain('nextTab');
        expect(js).toContain('prevTab');
      });

      it('should include tab completion tracking', () => {
        const js = generateFormJS('myForm', true, 2, true);

        expect(js).toContain('completedTabs');
        expect(js).toContain('markTabCompleted');
      });

      it('should include keyboard navigation', () => {
        const js = generateFormJS('myForm', true, 2, true);

        expect(js).toContain('ArrowRight');
        expect(js).toContain('ArrowLeft');
      });
    });

    // Date validation tests (parseDate function)
    describe('date validation in parseDate function', () => {
      // Helper to extract and test parseDate function
      const testParseDate = (dateString: string, rtl: boolean = true): Date | null => {
        const js = generateFormJS('myForm', rtl);

        // Extract IS_RTL constant
        const isRtlMatch = js.match(/const IS_RTL = (true|false);/);
        const isRtlValue = isRtlMatch ? isRtlMatch[1] : 'true';

        // Extract parseDate function from generated JS
        const parseDateMatch = js.match(/function parseDate\(str\) \{[\s\S]*?\n {4}\}/);
        if (!parseDateMatch) {
          throw new Error('parseDate function not found in generated JS');
        }

        // Create a safe eval context with the function and required constants
        const testCode = `
          const IS_RTL = ${isRtlValue};
          ${parseDateMatch[0]}
          return parseDate('${dateString}');
        `;

        try {
          // Using Function constructor is safer than eval for testing
          const testFn = new Function(testCode);
          return testFn();
        } catch (e) {
          return null;
        }
      };

      describe('valid dates', () => {
        it('should accept valid date: 15/06/2024', () => {
          const result = testParseDate('15/06/2024');
          expect(result).not.toBeNull();
          expect(result?.getDate()).toBe(15);
          expect(result?.getMonth()).toBe(5); // June is month 5 (0-indexed)
          expect(result?.getFullYear()).toBe(2024);
        });

        it('should accept valid date: 01/01/2000', () => {
          const result = testParseDate('01/01/2000');
          expect(result).not.toBeNull();
          expect(result?.getDate()).toBe(1);
          expect(result?.getMonth()).toBe(0);
          expect(result?.getFullYear()).toBe(2000);
        });

        it('should accept valid date: 31/12/2099', () => {
          const result = testParseDate('31/12/2099');
          expect(result).not.toBeNull();
          expect(result?.getDate()).toBe(31);
          expect(result?.getMonth()).toBe(11);
          expect(result?.getFullYear()).toBe(2099);
        });

        it('should accept leap year date: 29/02/2024', () => {
          const result = testParseDate('29/02/2024');
          expect(result).not.toBeNull();
          expect(result?.getDate()).toBe(29);
          expect(result?.getMonth()).toBe(1);
        });
      });

      describe('invalid month values', () => {
        it('should reject month 0 (prevents array out of bounds)', () => {
          const result = testParseDate('15/00/2024');
          expect(result).toBeNull();
        });

        it('should reject month 13', () => {
          const result = testParseDate('15/13/2024');
          expect(result).toBeNull();
        });

        it('should reject negative month', () => {
          const result = testParseDate('15/-1/2024');
          expect(result).toBeNull();
        });

        it('should reject month 99', () => {
          const result = testParseDate('15/99/2024');
          expect(result).toBeNull();
        });
      });

      describe('invalid day values', () => {
        it('should reject day 0', () => {
          const result = testParseDate('00/06/2024');
          expect(result).toBeNull();
        });

        it('should reject day 32', () => {
          const result = testParseDate('32/06/2024');
          expect(result).toBeNull();
        });

        it('should reject day 40', () => {
          const result = testParseDate('40/06/2024');
          expect(result).toBeNull();
        });

        it('should reject negative day', () => {
          const result = testParseDate('-5/06/2024');
          expect(result).toBeNull();
        });
      });

      describe('invalid year values', () => {
        it('should reject year before 1900', () => {
          const result = testParseDate('15/06/1899');
          expect(result).toBeNull();
        });

        it('should reject year after 2100', () => {
          const result = testParseDate('15/06/2101');
          expect(result).toBeNull();
        });

        it('should reject negative year', () => {
          const result = testParseDate('15/06/-100');
          expect(result).toBeNull();
        });

        it('should reject year 0', () => {
          const result = testParseDate('15/06/0000');
          expect(result).toBeNull();
        });
      });

      describe('invalid actual dates (calendar validity)', () => {
        it('should reject February 30', () => {
          const result = testParseDate('30/02/2024');
          expect(result).toBeNull();
        });

        it('should reject February 29 in non-leap year', () => {
          const result = testParseDate('29/02/2023');
          expect(result).toBeNull();
        });

        it('should reject April 31 (April has 30 days)', () => {
          const result = testParseDate('31/04/2024');
          expect(result).toBeNull();
        });

        it('should reject June 31 (June has 30 days)', () => {
          const result = testParseDate('31/06/2024');
          expect(result).toBeNull();
        });

        it('should reject September 31 (September has 30 days)', () => {
          const result = testParseDate('31/09/2024');
          expect(result).toBeNull();
        });

        it('should reject November 31 (November has 30 days)', () => {
          const result = testParseDate('31/11/2024');
          expect(result).toBeNull();
        });
      });

      describe('invalid formats', () => {
        it('should reject date with wrong separator', () => {
          const result = testParseDate('15-06-2024');
          expect(result).toBeNull();
        });

        it('should reject date with only 2 parts', () => {
          const result = testParseDate('15/06');
          expect(result).toBeNull();
        });

        it('should reject date with 4 parts', () => {
          const result = testParseDate('15/06/2024/extra');
          expect(result).toBeNull();
        });

        it('should reject empty string', () => {
          const result = testParseDate('');
          expect(result).toBeNull();
        });

        it('should reject non-numeric values', () => {
          const result = testParseDate('aa/bb/cccc');
          expect(result).toBeNull();
        });
      });

      describe('edge cases', () => {
        it('should accept dates at year boundary (1900)', () => {
          const result = testParseDate('01/01/1900');
          expect(result).not.toBeNull();
        });

        it('should accept dates at year boundary (2100)', () => {
          const result = testParseDate('31/12/2100');
          expect(result).not.toBeNull();
        });

        it('should accept minimum valid day (1)', () => {
          const result = testParseDate('01/06/2024');
          expect(result).not.toBeNull();
        });

        it('should accept maximum valid day for 31-day month', () => {
          const result = testParseDate('31/01/2024');
          expect(result).not.toBeNull();
        });

        it('should accept maximum valid day for 30-day month', () => {
          const result = testParseDate('30/04/2024');
          expect(result).not.toBeNull();
        });
      });
    });
  });
});
