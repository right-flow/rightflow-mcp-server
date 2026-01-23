/**
 * File Upload Form Component
 * Handles CSV/JSON file uploads for dynamic dropdown data sources
 */

import React, { useState, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface FileUploadFormProps {
  userId: string;
  onSuccess: (dataSource: any) => void;
  onCancel: () => void;
}

interface UploadStatus {
  type: 'idle' | 'validating' | 'uploading' | 'success' | 'error';
  message?: string;
}

export function FileUploadForm({ userId: _userId, onSuccess, onCancel }: FileUploadFormProps) {
  const { getToken } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>({ type: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    // Validate file type
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.csv' && ext !== '.json') {
      setStatus({
        type: 'error',
        message: 'רק קבצי CSV או JSON מותרים',
      });
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setStatus({
        type: 'error',
        message: `גודל הקובץ חורג מ-5MB (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
      });
      return;
    }

    setSelectedFile(file);
    setStatus({ type: 'idle' });

    // Auto-fill name if empty
    if (!name) {
      const nameWithoutExt = file.name.slice(0, file.name.lastIndexOf('.'));
      setName(nameWithoutExt);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !name.trim()) {
      setStatus({
        type: 'error',
        message: 'נא להזין שם ולבחור קובץ',
      });
      return;
    }

    setStatus({ type: 'uploading', message: 'מעלה קובץ...' });

    try {
      // Get authentication token
      const token = await getToken();
      if (!token) throw new Error('No authentication token available');

      // Read file as base64
      const fileContent = await readFileAsBase64(selectedFile);

      // Upload to server
      const response = await fetch('/api/data-sources-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          fileName: selectedFile.name,
          fileContent,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'העלאה נכשלה');
      }

      const result = await response.json();

      setStatus({
        type: 'success',
        message: result.message || 'הקובץ הועלה בהצלחה!',
      });

      // Call success callback after a short delay to show success message
      setTimeout(() => {
        onSuccess(result.data);
      }, 1000);
    } catch (err) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'העלאה נכשלה',
      });
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (data:text/csv;base64,)
        const base64 = result.split(',')[1];
        resolve(base64);
      };

      reader.onerror = () => {
        reject(new Error('שגיאה בקריאת הקובץ'));
      };

      reader.readAsDataURL(file);
    });
  };

  const isUploading = status.type === 'uploading' || status.type === 'validating';
  const isSuccess = status.type === 'success';

  return (
    <div className="space-y-4" dir="rtl">
      {/* Name Input */}
      <div>
        <Label htmlFor="ds-name">שם מקור הנתונים *</Label>
        <Input
          id="ds-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="לדוגמה: רשימת לקוחות 2025"
          disabled={isUploading || isSuccess}
          className="text-right"
        />
      </div>

      {/* Description Input */}
      <div>
        <Label htmlFor="ds-description">תיאור (אופציונלי)</Label>
        <Input
          id="ds-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="תיאור קצר של מקור הנתונים"
          disabled={isUploading || isSuccess}
          className="text-right"
        />
      </div>

      {/* File Input */}
      <div>
        <Label>קובץ CSV או JSON *</Label>
        <div className="mt-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json"
            onChange={handleFileSelect}
            disabled={isUploading || isSuccess}
            className="hidden"
          />

          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="w-full justify-start"
            disabled={isUploading || isSuccess}
          >
            <Upload className="w-4 h-4 ml-2" />
            {selectedFile ? selectedFile.name : 'בחר קובץ'}
          </Button>
        </div>

        {selectedFile && (
          <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {(selectedFile.size / 1024).toFixed(2)} KB
          </div>
        )}
      </div>

      {/* Status Message */}
      {status.message && (
        <div
          className={`p-3 rounded-md flex items-start gap-2 ${
            status.type === 'error'
              ? 'bg-red-50 text-red-800'
              : status.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-blue-50 text-blue-800'
          }`}
        >
          {status.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {status.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm">{status.message}</span>
        </div>
      )}

      {/* Format Help */}
      <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
        <p className="font-medium mb-1">פורמט נדרש:</p>
        <p className="mb-2">
          קובץ CSV עם 2 עמודות: <code className="bg-background px-1 py-0.5 rounded">label,value</code>
        </p>
        <p>
          או קובץ JSON עם מערך של אובייקטים: <code className="bg-background px-1 py-0.5 rounded">[{'{'}"label":"...","value":"..."{'}'}]</code>
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-2">
        <Button
          onClick={onCancel}
          variant="outline"
          disabled={isUploading || isSuccess}
        >
          ביטול
        </Button>
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || !name.trim() || isUploading || isSuccess}
        >
          {isUploading ? 'מעלה...' : isSuccess ? 'הועלה בהצלחה' : 'העלה קובץ'}
        </Button>
      </div>
    </div>
  );
}
