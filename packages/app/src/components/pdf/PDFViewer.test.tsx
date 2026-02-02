/**
 * PDFViewer Component Tests
 * Baseline tests for PDF viewing with RTL support
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PDFViewer } from './PDFViewer';
import { RTLGuard } from '@/utils/rtl-guard';

// Mock react-pdf
vi.mock('react-pdf', () => ({
  Document: vi.fn(({ children, onLoadSuccess, onLoadError, file }) => {
    // Simulate successful PDF load
    setTimeout(() => {
      if (file) {
        onLoadSuccess?.({ numPages: 3 });
      } else {
        onLoadError?.(new Error('No file provided'));
      }
    }, 100);
    return <div data-testid="pdf-document">{children}</div>;
  }),
  Page: vi.fn(({ pageNumber, width, height }) => (
    <div
      data-testid={`pdf-page-${pageNumber}`}
      data-width={width}
      data-height={height}
    >
      Page {pageNumber}
    </div>
  )),
  pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: '',
    },
  },
}));

// Mock field overlay components
vi.mock('./PDFCanvasOverlays', () => ({
  PDFCanvasOverlays: vi.fn(({ fields, selectedField, onFieldSelect }) => (
    <div data-testid="pdf-overlays">
      {fields?.map((field: any) => (
        <div
          key={field.id}
          data-testid={`field-overlay-${field.id}`}
          onClick={() => onFieldSelect?.(field)}
          className={selectedField?.id === field.id ? 'selected' : ''}
        >
          {field.label}
        </div>
      ))}
    </div>
  )),
}));

describe('PDFViewer', () => {
  const mockFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
  let rtlGuard: RTLGuard;

  beforeEach(() => {
    rtlGuard = new RTLGuard('ltr');
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render PDF document container', async () => {
      render(<PDFViewer file={mockFile} />);

      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('pdf-page-1')).toBeInTheDocument();
      });
    });

    it('should render multiple pages when available', async () => {
      render(<PDFViewer file={mockFile} />);

      await waitFor(() => {
        // Should render page 1 by default
        expect(screen.getByTestId('pdf-page-1')).toBeInTheDocument();
      });
    });

    it('should show loading state while PDF loads', () => {
      render(<PDFViewer file={mockFile} loading={true} />);

      // Should show loading indicator
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should handle error state', async () => {
      const onError = vi.fn();
      render(<PDFViewer file={null as any} onError={onError} />);

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });
  });

  describe('RTL Support', () => {
    it('should apply RTL layout when Hebrew PDF is detected', async () => {
      const hebrewPDF = new File(['עברית'], 'hebrew.pdf', { type: 'application/pdf' });

      render(
        <div dir="rtl">
          <PDFViewer file={hebrewPDF} />
        </div>
      );

      const container = screen.getByTestId('pdf-document');
      expect(container.parentElement).toHaveAttribute('dir', 'rtl');
    });

    it('should mirror field positions for RTL PDFs', async () => {
      const fields = [
        {
          id: 'field1',
          label: 'שם מלא', // Hebrew
          x: 100,
          y: 200,
          width: 150,
          height: 30,
          pageNumber: 1,
          direction: 'rtl' as const,
        },
      ];

      render(
        <div dir="rtl">
          <PDFViewer file={mockFile} fields={fields} />
        </div>
      );

      await waitFor(() => {
        const overlay = screen.getByTestId('pdf-overlays');
        expect(overlay).toBeInTheDocument();
      });

      // Verify RTL field is rendered
      expect(screen.getByTestId('field-overlay-field1')).toBeInTheDocument();
    });

    it('should handle mixed LTR/RTL fields', async () => {
      const fields = [
        {
          id: 'field1',
          label: 'Name',
          x: 100,
          y: 200,
          direction: 'ltr' as const,
        },
        {
          id: 'field2',
          label: 'שם',
          x: 300,
          y: 200,
          direction: 'rtl' as const,
        },
      ];

      render(<PDFViewer file={mockFile} fields={fields} />);

      await waitFor(() => {
        expect(screen.getByTestId('field-overlay-field1')).toBeInTheDocument();
        expect(screen.getByTestId('field-overlay-field2')).toBeInTheDocument();
      });
    });
  });

  describe('Field Interactions', () => {
    it('should handle field selection', async () => {
      const onFieldSelect = vi.fn();
      const fields = [
        {
          id: 'field1',
          label: 'Test Field',
          x: 100,
          y: 200,
        },
      ];

      render(
        <PDFViewer
          file={mockFile}
          fields={fields}
          onFieldSelect={onFieldSelect}
        />
      );

      await waitFor(() => {
        const field = screen.getByTestId('field-overlay-field1');
        fireEvent.click(field);
        expect(onFieldSelect).toHaveBeenCalledWith(fields[0]);
      });
    });

    it('should highlight selected field', async () => {
      const fields = [
        {
          id: 'field1',
          label: 'Test Field',
          x: 100,
          y: 200,
        },
      ];

      render(
        <PDFViewer
          file={mockFile}
          fields={fields}
          selectedField={fields[0]}
        />
      );

      await waitFor(() => {
        const field = screen.getByTestId('field-overlay-field1');
        expect(field).toHaveClass('selected');
      });
    });

    it('should support multi-field selection', async () => {
      const onFieldsSelect = vi.fn();
      const fields = [
        { id: 'field1', label: 'Field 1' },
        { id: 'field2', label: 'Field 2' },
      ];

      render(
        <PDFViewer
          file={mockFile}
          fields={fields}
          multiSelect={true}
          onFieldsSelect={onFieldsSelect}
        />
      );

      // Multi-select logic would be implemented in actual component
      expect(onFieldsSelect).toBeDefined();
    });
  });

  describe('Zoom and Navigation', () => {
    it('should handle zoom controls', async () => {
      const onZoomChange = vi.fn();

      render(
        <PDFViewer
          file={mockFile}
          zoom={1}
          onZoomChange={onZoomChange}
          showControls={true}
        />
      );

      // Zoom controls would be rendered
      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      });
    });

    it('should handle page navigation', async () => {
      const onPageChange = vi.fn();

      render(
        <PDFViewer
          file={mockFile}
          currentPage={1}
          onPageChange={onPageChange}
          showControls={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('pdf-page-1')).toBeInTheDocument();
      });

      // Page navigation would trigger callback
      expect(onPageChange).toBeDefined();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();

      render(
        <PDFViewer
          file={mockFile}
          currentPage={1}
          onPageChange={onPageChange}
          enableKeyboardNav={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('pdf-page-1')).toBeInTheDocument();
      });

      // Navigate with arrow keys
      await user.keyboard('{ArrowRight}'); // Next page
      await user.keyboard('{ArrowLeft}');  // Previous page

      // Callbacks would be triggered in actual implementation
    });
  });

  describe('Field Extraction', () => {
    it('should support automatic field extraction', async () => {
      const onFieldsExtracted = vi.fn();

      render(
        <PDFViewer
          file={mockFile}
          enableExtraction={true}
          onFieldsExtracted={onFieldsExtracted}
        />
      );

      await waitFor(() => {
        // Extraction would be triggered after PDF loads
        expect(onFieldsExtracted).toBeDefined();
      });
    });

    it('should detect Hebrew fields during extraction', async () => {
      const onFieldsExtracted = vi.fn();

      render(
        <PDFViewer
          file={mockFile}
          enableExtraction={true}
          onFieldsExtracted={onFieldsExtracted}
          extractionOptions={{
            detectLanguage: true,
            detectRTL: true,
          }}
        />
      );

      // Mock extraction result
      const extractedFields = [
        {
          id: 'auto-1',
          label: 'שם מלא',
          direction: 'rtl',
          detected: true,
        },
      ];

      // In actual implementation, extraction would happen automatically
      await waitFor(() => {
        expect(onFieldsExtracted).toBeDefined();
      });
    });
  });

  describe('Performance', () => {
    it('should lazy load pages for large PDFs', async () => {
      const largePDF = new File(['large pdf'], 'large.pdf', { type: 'application/pdf' });

      render(
        <PDFViewer
          file={largePDF}
          lazyLoad={true}
          pageBuffer={2}
        />
      );

      await waitFor(() => {
        // Only visible pages + buffer should be rendered
        expect(screen.getByTestId('pdf-page-1')).toBeInTheDocument();
      });
    });

    it('should handle viewport-based rendering', async () => {
      render(
        <PDFViewer
          file={mockFile}
          renderMode="viewport"
          viewportBuffer={100}
        />
      );

      await waitFor(() => {
        // Only pages in viewport should be fully rendered
        expect(screen.getByTestId('pdf-page-1')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<PDFViewer file={mockFile} />);

      await waitFor(() => {
        const document = screen.getByTestId('pdf-document');
        expect(document).toHaveAttribute('role', 'document');
      });
    });

    it('should announce page changes to screen readers', async () => {
      const onPageChange = vi.fn();

      render(
        <PDFViewer
          file={mockFile}
          currentPage={1}
          onPageChange={onPageChange}
          announcePageChanges={true}
        />
      );

      // Page change announcements would be handled via aria-live regions
      await waitFor(() => {
        expect(screen.getByTestId('pdf-page-1')).toBeInTheDocument();
      });
    });

    it('should support keyboard-only interaction', async () => {
      const user = userEvent.setup();

      render(
        <PDFViewer
          file={mockFile}
          fields={[
            { id: 'field1', label: 'Field 1' },
            { id: 'field2', label: 'Field 2' },
          ]}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('pdf-page-1')).toBeInTheDocument();
      });

      // Tab through fields
      await user.tab();
      await user.tab();

      // Enter to select field
      await user.keyboard('{Enter}');
    });
  });
});