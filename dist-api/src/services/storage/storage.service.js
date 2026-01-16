/**
 * Railway Volume Storage Service (Phase 0)
 * Handles file uploads/downloads to Railway persistent volumes
 *
 * Replaces Vercel Blob for Railway deployment
 */
import fs from 'fs/promises';
import path from 'path';
export class StorageService {
    storagePath;
    baseUrl;
    maxFileSizeMB;
    constructor() {
        this.storagePath = process.env.STORAGE_PATH || '/app/uploads';
        this.baseUrl = process.env.STORAGE_BASE_URL || 'https://api.rightflow.app/files';
        this.maxFileSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10);
    }
    /**
     * Upload file to Railway volume
     */
    async uploadFile(buffer, fileName, _options) {
        try {
            // Validate file size
            const fileSizeMB = buffer.length / (1024 * 1024);
            if (fileSizeMB > this.maxFileSizeMB) {
                return {
                    success: false,
                    error: `File size (${fileSizeMB.toFixed(2)}MB) exceeds limit of ${this.maxFileSizeMB}MB`,
                };
            }
            // Sanitize file path
            const sanitizedPath = this.sanitizePath(fileName);
            // Check for path traversal attempts
            if (sanitizedPath !== fileName || sanitizedPath.includes('..')) {
                return {
                    success: false,
                    error: 'Invalid file path detected',
                };
            }
            // Full path on volume
            const fullPath = path.join(this.storagePath, sanitizedPath);
            // Create directory if it doesn't exist
            const directory = path.dirname(fullPath);
            await fs.mkdir(directory, { recursive: true });
            // Write file
            await fs.writeFile(fullPath, buffer);
            // Generate public URL
            const url = this.getFileUrl(sanitizedPath);
            return {
                success: true,
                path: sanitizedPath,
                url,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Upload failed',
            };
        }
    }
    /**
     * Download file from Railway volume
     */
    async downloadFile(fileName) {
        const sanitizedPath = this.sanitizePath(fileName);
        const fullPath = path.join(this.storagePath, sanitizedPath);
        const buffer = await fs.readFile(fullPath);
        return buffer;
    }
    /**
     * Delete file from Railway volume
     */
    async deleteFile(fileName) {
        try {
            const sanitizedPath = this.sanitizePath(fileName);
            const fullPath = path.join(this.storagePath, sanitizedPath);
            await fs.unlink(fullPath);
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Delete failed',
            };
        }
    }
    /**
     * Get public URL for file
     */
    getFileUrl(filePath) {
        const sanitizedPath = this.sanitizePath(filePath);
        return `${this.baseUrl}/${sanitizedPath}`;
    }
    /**
     * Sanitize file path to prevent directory traversal
     */
    sanitizePath(filePath) {
        // Remove leading slashes
        let sanitized = filePath.replace(/^\/+/, '');
        // Normalize path separators
        sanitized = sanitized.replace(/\\/g, '/');
        // Remove parent directory references
        const parts = sanitized.split('/').filter((part) => {
            return part !== '..' && part !== '.' && part.length > 0;
        });
        // Remove dangerous directory names (etc, system32, windows, etc.)
        const dangerousDirs = ['etc', 'system32', 'windows', 'boot', 'root'];
        const safeParts = parts.filter((part) => {
            const lowerPart = part.toLowerCase();
            return !dangerousDirs.some(dir => lowerPart === dir || lowerPart.startsWith(dir + '/'));
        });
        return safeParts.join('/');
    }
    /**
     * Organize file path based on user, form, and type
     * Creates structured directory hierarchy
     */
    organizePath(options) {
        const { userId, formId, fileName, type } = options;
        // Sanitize all inputs
        const sanitizedUserId = this.sanitizePath(userId);
        const sanitizedFormId = this.sanitizePath(formId);
        const sanitizedFileName = this.sanitizePath(fileName);
        // Organize by type
        const typeDir = type === 'pdf' ? 'pdfs' : type === 'filled' ? 'filled' : 'temp';
        // Create hierarchical path
        return `${typeDir}/${sanitizedUserId}/${sanitizedFormId}/${sanitizedFileName}`;
    }
    /**
     * Check if file exists
     */
    async fileExists(fileName) {
        try {
            const sanitizedPath = this.sanitizePath(fileName);
            const fullPath = path.join(this.storagePath, sanitizedPath);
            await fs.access(fullPath);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * List files in directory
     */
    async listFiles(directory) {
        try {
            const sanitizedDir = this.sanitizePath(directory);
            const fullPath = path.join(this.storagePath, sanitizedDir);
            const files = await fs.readdir(fullPath);
            return files;
        }
        catch (error) {
            return [];
        }
    }
    /**
     * Get file stats (size, created date, etc.)
     */
    async getFileStats(fileName) {
        const sanitizedPath = this.sanitizePath(fileName);
        const fullPath = path.join(this.storagePath, sanitizedPath);
        const stats = await fs.stat(fullPath);
        return {
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            isDirectory: stats.isDirectory(),
        };
    }
}
// Export singleton instance
export const storageService = new StorageService();
//# sourceMappingURL=storage.service.js.map