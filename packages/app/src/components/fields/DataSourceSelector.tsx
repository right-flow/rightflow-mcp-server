/**
 * Data Source Selector Component
 * Allows users to select a data source for dynamic dropdowns
 * or create a new one via file upload
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Database, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileUploadForm } from './FileUploadForm';

interface DataSource {
  id: string;
  name: string;
  source_type: string;
  config: {
    row_count?: number;
    item_count?: number;
    options?: Array<{ label: string; value: string }>;
  };
  created_at: string;
}

interface DataSourceSelectorProps {
  value?: string; // Selected data source ID
  onChange: (dataSourceId: string | undefined) => void;
  userId: string;
}

export function DataSourceSelector({ value, onChange, userId }: DataSourceSelectorProps) {
  const { getToken } = useAuth();
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const loadDataSources = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('No authentication token available');

      const response = await fetch('/api/data-sources', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load data sources');
      }

      const result = await response.json();
      setDataSources(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data sources');
      console.error('Error loading data sources:', err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  // Load data sources on mount
  useEffect(() => {
    loadDataSources();
  }, [loadDataSources]);

  const handleUploadSuccess = (newDataSource: DataSource) => {
    // Add to list
    setDataSources(prev => [newDataSource, ...prev]);

    // Auto-select the newly uploaded data source
    onChange(newDataSource.id);

    // Close dialog
    setShowUploadDialog(false);
  };

  const getDataSourceLabel = (ds: DataSource) => {
    const itemCount = ds.config.row_count || ds.config.item_count || ds.config.options?.length || 0;
    const typeLabel = ds.source_type === 'csv_import' ? 'CSV' :
      ds.source_type === 'json_import' ? 'JSON' :
        ds.source_type;

    return `${ds.name} (${typeLabel} - ${itemCount} items)`;
  };

  if (error) {
    return (
      <div className="space-y-2" dir="rtl">
        <Label>מקור נתונים דינמי</Label>
        <div className="text-red-500 text-sm">{error}</div>
        <Button onClick={loadDataSources} variant="outline" size="sm">
          נסה שנית
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2" dir="rtl">
      <Label className="flex items-center gap-2">
        <Database className="w-4 h-4" />
        מקור נתונים דינמי
      </Label>

      <div className="flex gap-2">
        <Select
          value={value || 'none'}
          onChange={(e) => onChange(e.target.value === 'none' ? undefined : e.target.value)}
          disabled={loading}
          className="flex-1"
        >
          <option value="none">ללא מקור נתונים (אופציות סטטיות)</option>
          {dataSources.map(ds => (
            <option key={ds.id} value={ds.id}>
              {getDataSourceLabel(ds)}
            </option>
          ))}
        </Select>

        <Button
          onClick={() => setShowUploadDialog(true)}
          variant="outline"
          size="icon"
          title="העלה קובץ CSV/JSON"
        >
          <Upload className="w-4 h-4" />
        </Button>
      </div>

      {value && (
        <div className="text-sm text-muted-foreground">
          שימוש במקור נתונים דינמי. האופציות הסטטיות יתעלמו.
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>העלה קובץ נתונים</DialogTitle>
          </DialogHeader>
          <FileUploadForm
            userId={userId}
            onSuccess={handleUploadSuccess}
            onCancel={() => setShowUploadDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
