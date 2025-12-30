import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DocumentHistoryEntry, DocumentHistoryInput } from './types';

// Mock sql.js before importing the service
vi.mock('sql.js', () => {
  const mockDb = {
    run: vi.fn(),
    exec: vi.fn().mockReturnValue([]),
    export: vi.fn().mockReturnValue(new Uint8Array()),
    close: vi.fn(),
  };

  const MockDatabase = vi.fn().mockImplementation(() => mockDb);

  return {
    default: vi.fn().mockResolvedValue({
      Database: MockDatabase,
    }),
  };
});

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(),
};

const mockIDBRequest = {
  onsuccess: null as ((event: unknown) => void) | null,
  onerror: null as ((event: unknown) => void) | null,
  onupgradeneeded: null as ((event: unknown) => void) | null,
  result: null as unknown,
};

const mockIDBTransaction = {
  objectStore: vi.fn(),
};

const mockIDBObjectStore = {
  get: vi.fn(),
  put: vi.fn(),
};

describe('DocumentHistoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup IndexedDB mock
    mockIDBRequest.result = {
      objectStoreNames: { contains: vi.fn().mockReturnValue(true) },
      createObjectStore: vi.fn(),
      transaction: vi.fn().mockReturnValue(mockIDBTransaction),
    };

    mockIDBTransaction.objectStore.mockReturnValue(mockIDBObjectStore);

    mockIDBObjectStore.get.mockReturnValue({
      onsuccess: null,
      onerror: null,
      result: null,
    });

    mockIDBObjectStore.put.mockReturnValue({
      onsuccess: null,
      onerror: null,
    });

    mockIndexedDB.open.mockImplementation(() => {
      setTimeout(() => {
        if (mockIDBRequest.onsuccess) {
          mockIDBRequest.onsuccess({ target: mockIDBRequest });
        }
      }, 0);
      return mockIDBRequest;
    });

    // @ts-expect-error - Mocking global indexedDB
    global.indexedDB = mockIndexedDB;
  });

  describe('DocumentHistoryEntry type', () => {
    it('has correct shape', () => {
      const entry: DocumentHistoryEntry = {
        id: 1,
        fileName: 'test.pdf',
        fileSize: 1024,
        pageCount: 5,
        fieldCount: 10,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        fieldsJson: '[]',
        pdfHash: undefined,
      };

      expect(entry.id).toBe(1);
      expect(entry.fileName).toBe('test.pdf');
      expect(entry.fileSize).toBe(1024);
      expect(entry.pageCount).toBe(5);
      expect(entry.fieldCount).toBe(10);
      expect(entry.fieldsJson).toBe('[]');
    });
  });

  describe('DocumentHistoryInput type', () => {
    it('has correct shape', () => {
      const input: DocumentHistoryInput = {
        fileName: 'test.pdf',
        fileSize: 1024,
        pageCount: 5,
        fieldCount: 10,
        fields: [],
        pdfHash: 'abc123',
      };

      expect(input.fileName).toBe('test.pdf');
      expect(input.fields).toEqual([]);
    });
  });
});

describe('DocumentHistoryService Integration', () => {
  it('exports documentHistoryService', async () => {
    const { documentHistoryService } = await import('./index');
    expect(documentHistoryService).toBeDefined();
    expect(typeof documentHistoryService.init).toBe('function');
    expect(typeof documentHistoryService.addDocument).toBe('function');
    expect(typeof documentHistoryService.getDocuments).toBe('function');
    expect(typeof documentHistoryService.getDocument).toBe('function');
    expect(typeof documentHistoryService.deleteDocument).toBe('function');
    expect(typeof documentHistoryService.clearHistory).toBe('function');
  });
});
