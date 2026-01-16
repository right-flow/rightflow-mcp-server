import initSqlJs from 'sql.js';
const DB_NAME = 'rightflow_document_history';
const INDEXEDDB_STORE = 'sqlitedb';
class DocumentHistoryService {
    db = null;
    SQL = null;
    initPromise = null;
    async init() {
        if (this.db)
            return;
        if (this.initPromise)
            return this.initPromise;
        this.initPromise = this._initialize();
        return this.initPromise;
    }
    async _initialize() {
        try {
            // Initialize SQL.js with the WASM file from CDN
            this.SQL = await initSqlJs({
                locateFile: (file) => `https://sql.js.org/dist/${file}`,
            });
            // Try to load existing database from IndexedDB
            const savedData = await this.loadFromIndexedDB();
            if (savedData) {
                this.db = new this.SQL.Database(savedData);
            }
            else {
                this.db = new this.SQL.Database();
                this.createTables();
            }
        }
        catch (error) {
            console.error('Failed to initialize SQLite:', error);
            throw error;
        }
    }
    createTables() {
        if (!this.db)
            return;
        this.db.run(`
      CREATE TABLE IF NOT EXISTS document_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        page_count INTEGER NOT NULL,
        field_count INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        fields_json TEXT NOT NULL,
        pdf_hash TEXT
      )
    `);
        this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_created_at ON document_history(created_at DESC)
    `);
        this.saveToIndexedDB();
    }
    async loadFromIndexedDB() {
        return new Promise((resolve) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(INDEXEDDB_STORE)) {
                    db.createObjectStore(INDEXEDDB_STORE);
                }
            };
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(INDEXEDDB_STORE, 'readonly');
                const store = transaction.objectStore(INDEXEDDB_STORE);
                const getRequest = store.get('database');
                getRequest.onsuccess = () => {
                    resolve(getRequest.result || null);
                };
                getRequest.onerror = () => {
                    resolve(null);
                };
            };
            request.onerror = () => {
                resolve(null);
            };
        });
    }
    async saveToIndexedDB() {
        if (!this.db)
            return;
        const data = this.db.export();
        const buffer = new Uint8Array(data);
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(INDEXEDDB_STORE)) {
                    db.createObjectStore(INDEXEDDB_STORE);
                }
            };
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(INDEXEDDB_STORE, 'readwrite');
                const store = transaction.objectStore(INDEXEDDB_STORE);
                const putRequest = store.put(buffer, 'database');
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(putRequest.error);
            };
            request.onerror = () => reject(request.error);
        });
    }
    async addDocument(input) {
        await this.init();
        if (!this.db)
            throw new Error('Database not initialized');
        const now = new Date().toISOString();
        const fieldsJson = JSON.stringify(input.fields);
        this.db.run(`INSERT INTO document_history
        (file_name, file_size, page_count, field_count, created_at, updated_at, fields_json, pdf_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
            input.fileName,
            input.fileSize,
            input.pageCount,
            input.fieldCount,
            now,
            now,
            fieldsJson,
            input.pdfHash || null,
        ]);
        const result = this.db.exec('SELECT last_insert_rowid() as id');
        const id = result[0]?.values[0]?.[0];
        await this.saveToIndexedDB();
        return id;
    }
    async updateDocument(id, input) {
        await this.init();
        if (!this.db)
            throw new Error('Database not initialized');
        const updates = [];
        const values = [];
        if (input.fileName !== undefined) {
            updates.push('file_name = ?');
            values.push(input.fileName);
        }
        if (input.fileSize !== undefined) {
            updates.push('file_size = ?');
            values.push(input.fileSize);
        }
        if (input.pageCount !== undefined) {
            updates.push('page_count = ?');
            values.push(input.pageCount);
        }
        if (input.fieldCount !== undefined) {
            updates.push('field_count = ?');
            values.push(input.fieldCount);
        }
        if (input.fields !== undefined) {
            updates.push('fields_json = ?');
            values.push(JSON.stringify(input.fields));
        }
        updates.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(id);
        this.db.run(`UPDATE document_history SET ${updates.join(', ')} WHERE id = ?`, values);
        await this.saveToIndexedDB();
    }
    async getDocuments(limit = 50) {
        await this.init();
        if (!this.db)
            throw new Error('Database not initialized');
        const result = this.db.exec(`SELECT id, file_name, file_size, page_count, field_count,
              created_at, updated_at, fields_json, pdf_hash
       FROM document_history
       ORDER BY updated_at DESC
       LIMIT ?`, [limit]);
        if (!result[0])
            return [];
        return result[0].values.map((row) => ({
            id: row[0],
            fileName: row[1],
            fileSize: row[2],
            pageCount: row[3],
            fieldCount: row[4],
            createdAt: row[5],
            updatedAt: row[6],
            fieldsJson: row[7],
            pdfHash: row[8],
        }));
    }
    async getDocument(id) {
        await this.init();
        if (!this.db)
            throw new Error('Database not initialized');
        const result = this.db.exec(`SELECT id, file_name, file_size, page_count, field_count,
              created_at, updated_at, fields_json, pdf_hash
       FROM document_history
       WHERE id = ?`, [id]);
        if (!result[0] || !result[0].values[0])
            return null;
        const row = result[0].values[0];
        return {
            id: row[0],
            fileName: row[1],
            fileSize: row[2],
            pageCount: row[3],
            fieldCount: row[4],
            createdAt: row[5],
            updatedAt: row[6],
            fieldsJson: row[7],
            pdfHash: row[8],
        };
    }
    async deleteDocument(id) {
        await this.init();
        if (!this.db)
            throw new Error('Database not initialized');
        this.db.run('DELETE FROM document_history WHERE id = ?', [id]);
        await this.saveToIndexedDB();
    }
    async clearHistory() {
        await this.init();
        if (!this.db)
            throw new Error('Database not initialized');
        this.db.run('DELETE FROM document_history');
        await this.saveToIndexedDB();
    }
}
// Singleton instance
export const documentHistoryService = new DocumentHistoryService();
//# sourceMappingURL=document-history.service.js.map