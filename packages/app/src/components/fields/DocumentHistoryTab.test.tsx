import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocumentHistoryTab } from './DocumentHistoryTab';
import { DocumentHistoryEntry } from '@/services/document-history';

// Mock the document history service
const mockDocuments: DocumentHistoryEntry[] = [
  {
    id: 1,
    fileName: 'test-document.pdf',
    fileSize: 1024 * 500, // 500 KB
    pageCount: 5,
    fieldCount: 10,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-16T14:30:00Z',
    fieldsJson: JSON.stringify([
      { id: '1', type: 'text', name: 'field1' },
      { id: '2', type: 'checkbox', name: 'checkbox1' },
    ]),
  },
  {
    id: 2,
    fileName: 'another-doc.pdf',
    fileSize: 1024 * 1024 * 2, // 2 MB
    pageCount: 10,
    fieldCount: 25,
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-14T16:00:00Z',
    fieldsJson: JSON.stringify([{ id: '3', type: 'text', name: 'field3' }]),
  },
];

vi.mock('@/services/document-history', () => ({
  documentHistoryService: {
    getDocuments: vi.fn(),
    deleteDocument: vi.fn(),
    clearHistory: vi.fn(),
  },
}));

// Mock i18n
vi.mock('@/i18n', () => ({
  useTranslation: () => ({
    noDocumentHistory: 'No document history',
    documents: 'documents',
    pages: 'Pages',
    fields: 'fields',
    field: 'field',
    lastModified: 'Last Modified',
    loadHistoryFields: 'Load Fields',
    deleteHistory: 'Delete',
    clearAllHistory: 'Clear History',
    clearHistoryConfirm: 'Delete all document history?',
    bytes: 'bytes',
    kb: 'KB',
    mb: 'MB',
    redo: 'Retry',
  }),
  useDirection: () => 'ltr',
}));

describe('DocumentHistoryTab', () => {
  const mockOnLoadFields = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    const { documentHistoryService } = await import('@/services/document-history');
    vi.mocked(documentHistoryService.getDocuments).mockResolvedValue([]);
    vi.mocked(documentHistoryService.deleteDocument).mockResolvedValue();
    vi.mocked(documentHistoryService.clearHistory).mockResolvedValue();
  });

  describe('loading state', () => {
    it('shows loading spinner initially', () => {
      const { container } = render(<DocumentHistoryTab onLoadFields={mockOnLoadFields} />);

      // Component should show loading state initially (Loader2 icon has animate-spin class)
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).not.toBeNull();
    });
  });

  describe('empty state', () => {
    it('shows empty message when no documents', async () => {
      const { documentHistoryService } = await import('@/services/document-history');
      vi.mocked(documentHistoryService.getDocuments).mockResolvedValue([]);

      render(<DocumentHistoryTab onLoadFields={mockOnLoadFields} />);

      await waitFor(() => {
        expect(screen.getByText('No document history')).toBeInTheDocument();
      });
    });
  });

  describe('with documents', () => {
    beforeEach(async () => {
      const { documentHistoryService } = await import('@/services/document-history');
      vi.mocked(documentHistoryService.getDocuments).mockResolvedValue(mockDocuments);
    });

    it('displays document list', async () => {
      render(<DocumentHistoryTab onLoadFields={mockOnLoadFields} />);

      await waitFor(() => {
        expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
        expect(screen.getByText('another-doc.pdf')).toBeInTheDocument();
      });
    });

    it('shows page count for each document', async () => {
      const { container } = render(<DocumentHistoryTab onLoadFields={mockOnLoadFields} />);

      await waitFor(() => {
        expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
      });

      // Check that page counts are displayed (5 pages in first doc, 10 in second)
      const pageInfo = container.querySelectorAll('.grid > div');
      expect(pageInfo.length).toBeGreaterThan(0);
    });

    it('shows field count for each document', async () => {
      render(<DocumentHistoryTab onLoadFields={mockOnLoadFields} />);

      await waitFor(() => {
        // Check for field counts in the document cards
        const cards = screen.getAllByRole('button', { name: /load fields/i });
        expect(cards).toHaveLength(2);
      });
    });

    it('formats file size correctly', async () => {
      render(<DocumentHistoryTab onLoadFields={mockOnLoadFields} />);

      await waitFor(() => {
        expect(screen.getByText(/500.*KB/i)).toBeInTheDocument();
        expect(screen.getByText(/2.*MB/i)).toBeInTheDocument();
      });
    });
  });

  describe('loading fields', () => {
    beforeEach(async () => {
      const { documentHistoryService } = await import('@/services/document-history');
      vi.mocked(documentHistoryService.getDocuments).mockResolvedValue(mockDocuments);
    });

    it('calls onLoadFields when document is clicked', async () => {
      render(<DocumentHistoryTab onLoadFields={mockOnLoadFields} />);

      await waitFor(() => {
        expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('test-document.pdf'));

      expect(mockOnLoadFields).toHaveBeenCalledWith([
        { id: '1', type: 'text', name: 'field1' },
        { id: '2', type: 'checkbox', name: 'checkbox1' },
      ]);
    });

    it('calls onLoadFields when Load Fields button is clicked', async () => {
      render(<DocumentHistoryTab onLoadFields={mockOnLoadFields} />);

      await waitFor(() => {
        expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
      });

      const loadButtons = screen.getAllByRole('button', { name: /load fields/i });
      fireEvent.click(loadButtons[0]);

      expect(mockOnLoadFields).toHaveBeenCalled();
    });
  });

  describe('deleting documents', () => {
    beforeEach(async () => {
      const { documentHistoryService } = await import('@/services/document-history');
      vi.mocked(documentHistoryService.getDocuments).mockResolvedValue(mockDocuments);
    });

    it('deletes document when delete button is clicked', async () => {
      const { documentHistoryService } = await import('@/services/document-history');

      render(<DocumentHistoryTab onLoadFields={mockOnLoadFields} />);

      await waitFor(() => {
        expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(documentHistoryService.deleteDocument).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('clearing history', () => {
    beforeEach(async () => {
      const { documentHistoryService } = await import('@/services/document-history');
      vi.mocked(documentHistoryService.getDocuments).mockResolvedValue(mockDocuments);
      // Mock window.confirm
      vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    it('clears all history when clear button is clicked and confirmed', async () => {
      const { documentHistoryService } = await import('@/services/document-history');

      render(<DocumentHistoryTab onLoadFields={mockOnLoadFields} />);

      await waitFor(() => {
        expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
      });

      const clearButton = screen.getByRole('button', { name: 'Clear History' });
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(documentHistoryService.clearHistory).toHaveBeenCalled();
      });
    });

    it('does not clear history when confirmation is cancelled', async () => {
      const { documentHistoryService } = await import('@/services/document-history');
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<DocumentHistoryTab onLoadFields={mockOnLoadFields} />);

      await waitFor(() => {
        expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
      });

      const clearButton = screen.getByRole('button', { name: 'Clear History' });
      fireEvent.click(clearButton);

      expect(documentHistoryService.clearHistory).not.toHaveBeenCalled();
    });
  });
});
