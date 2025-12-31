import { describe, it, expect } from 'vitest';
import { generateDocsFlowCSS, generateFormJS } from './html-generator-css';

describe('html-generator-css', () => {
  describe('generateDocsFlowCSS', () => {
    const defaultTheme = {
      primaryColor: '#003399',
      fontFamily: "'Segoe UI', Tahoma, sans-serif",
      spacing: 'normal' as const,
      style: 'modern' as const,
    };

    it('should generate valid CSS', () => {
      const css = generateDocsFlowCSS(true, defaultTheme);

      expect(css).toContain(':root');
      expect(css).toContain('body');
      expect(css).toContain('.container');
    });

    it('should set RTL direction when rtl is true', () => {
      const css = generateDocsFlowCSS(true, defaultTheme);

      expect(css).toContain('direction: rtl');
    });

    it('should set LTR direction when rtl is false', () => {
      const css = generateDocsFlowCSS(false, defaultTheme);

      expect(css).toContain('direction: ltr');
    });

    it('should include the primary color', () => {
      const css = generateDocsFlowCSS(true, {
        ...defaultTheme,
        primaryColor: '#ff5500',
      });

      expect(css).toContain('#ff5500');
    });

    it('should include the font family', () => {
      const css = generateDocsFlowCSS(true, {
        ...defaultTheme,
        fontFamily: 'Arial, sans-serif',
      });

      expect(css).toContain('Arial, sans-serif');
    });

    it('should apply compact spacing', () => {
      const css = generateDocsFlowCSS(true, {
        ...defaultTheme,
        spacing: 'compact',
      });

      expect(css).toContain('15px'); // compact padding
      expect(css).toContain('10px'); // compact gap
    });

    it('should apply spacious spacing', () => {
      const css = generateDocsFlowCSS(true, {
        ...defaultTheme,
        spacing: 'spacious',
      });

      expect(css).toContain('30px'); // spacious padding
      expect(css).toContain('20px'); // spacious gap
    });

    it('should apply modern style with rounded corners', () => {
      const css = generateDocsFlowCSS(true, {
        ...defaultTheme,
        style: 'modern',
      });

      expect(css).toContain('8px'); // border-radius
      expect(css).toContain('box-shadow');
    });

    it('should apply classic style with no rounded corners', () => {
      const css = generateDocsFlowCSS(true, {
        ...defaultTheme,
        style: 'classic',
      });

      expect(css).toContain('border-radius: 0');
    });

    it('should apply minimal style', () => {
      const css = generateDocsFlowCSS(true, {
        ...defaultTheme,
        style: 'minimal',
      });

      expect(css).toContain('box-shadow: none');
    });

    it('should include responsive media queries', () => {
      const css = generateDocsFlowCSS(true, defaultTheme);

      expect(css).toContain('@media (max-width: 768px)');
      expect(css).toContain('@media (max-width: 480px)');
    });

    it('should include print styles', () => {
      const css = generateDocsFlowCSS(true, defaultTheme);

      expect(css).toContain('@media print');
    });

    it('should include form element styles', () => {
      const css = generateDocsFlowCSS(true, defaultTheme);

      expect(css).toContain('input[type="text"]');
      expect(css).toContain('select');
      expect(css).toContain('textarea');
      expect(css).toContain('fieldset');
      expect(css).toContain('legend');
    });

    it('should include checkbox and radio styles', () => {
      const css = generateDocsFlowCSS(true, defaultTheme);

      expect(css).toContain('.checkbox-item');
      expect(css).toContain('.radio-group');
    });

    it('should include submit button styles', () => {
      const css = generateDocsFlowCSS(true, defaultTheme);

      expect(css).toContain('button[type="submit"]');
      expect(css).toContain('.btn-submit');
    });

    it('should include signature box styles', () => {
      const css = generateDocsFlowCSS(true, defaultTheme);

      expect(css).toContain('.signature-box');
    });

    it('should include signature pad container styles', () => {
      const css = generateDocsFlowCSS(true, defaultTheme);

      expect(css).toContain('.signature-pad-container');
      expect(css).toContain('.signature-canvas');
      expect(css).toContain('.signature-controls');
      expect(css).toContain('.signature-clear-btn');
    });

    it('should include signature canvas interaction styles', () => {
      const css = generateDocsFlowCSS(true, defaultTheme);

      expect(css).toContain('.signature-canvas.signing');
      expect(css).toContain('.signature-canvas.has-signature');
      expect(css).toContain('cursor: crosshair');
    });

    it('should include welcome page styles', () => {
      const css = generateDocsFlowCSS(true, defaultTheme);

      expect(css).toContain('.welcome-page');
      expect(css).toContain('.welcome-section-title');
      expect(css).toContain('.welcome-text');
      expect(css).toContain('.welcome-info-box');
      expect(css).toContain('.welcome-documents-list');
      expect(css).toContain('.welcome-company-name');
    });

    it('should apply RTL border for welcome elements when rtl is true', () => {
      const css = generateDocsFlowCSS(true, defaultTheme);

      expect(css).toContain('border-right');
      expect(css).toContain('padding-right');
    });

    it('should apply LTR border for welcome elements when rtl is false', () => {
      const css = generateDocsFlowCSS(false, defaultTheme);

      expect(css).toContain('border-left');
      expect(css).toContain('padding-left');
    });

    it('should include validation styles', () => {
      const css = generateDocsFlowCSS(true, defaultTheme);

      expect(css).toContain('.field-validation');
    });

    it('should include focus states', () => {
      const css = generateDocsFlowCSS(true, defaultTheme);

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
  });
});
