import { useState } from 'react';
import { List, Code, History } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FieldDefinition } from '@/types/fields';
import { useTranslation, useDirection } from '@/i18n';
import { ExtractedFieldsTab } from './ExtractedFieldsTab';
import { JsonViewTab } from './JsonViewTab';
import { DocumentHistoryTab } from './DocumentHistoryTab';

interface FieldListSidebarProps {
  fields: FieldDefinition[];
  selectedFieldId: string | null;
  selectedFieldIds: string[];
  currentPage: number;
  errorFieldIds?: Set<string>;
  onFieldSelect: (fieldId: string) => void;
  onToggleFieldSelection: (fieldId: string) => void;
  onFieldDelete: (fieldId: string) => void;
  onPageNavigate: (page: number) => void;
  hoveredFieldId: string | null;
  onFieldHover: (fieldId: string | null) => void;
  onLoadFieldsFromHistory?: (fields: FieldDefinition[]) => void;
}

export const FieldListSidebar = ({
  fields,
  selectedFieldId,
  selectedFieldIds,
  currentPage,
  errorFieldIds,
  onFieldSelect,
  onToggleFieldSelection,
  onFieldDelete,
  onPageNavigate,
  hoveredFieldId,
  onFieldHover,
  onLoadFieldsFromHistory,
}: FieldListSidebarProps) => {
  const t = useTranslation();
  const direction = useDirection();
  const [activeTab, setActiveTab] = useState('fields');

  const handleLoadFieldsFromHistory = (loadedFields: FieldDefinition[]) => {
    if (onLoadFieldsFromHistory) {
      onLoadFieldsFromHistory(loadedFields);
    }
    // Switch to fields tab after loading
    setActiveTab('fields');
  };

  return (
    <div
      className="w-64 h-full bg-sidebar-bg border-r border-border flex flex-col"
      dir={direction}
    >
      {/* Title */}
      <div className="p-3 border-b border-border">
        <h3 className="text-lg font-semibold">{t.fieldsList}</h3>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        defaultValue="fields"
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="mx-2 mt-2">
          <TabsTrigger value="fields" className="gap-1">
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.extractedFields}</span>
          </TabsTrigger>
          <TabsTrigger value="json" className="gap-1">
            <Code className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.jsonView}</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1">
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.documentHistory}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fields" className="flex-1 overflow-hidden">
          <ExtractedFieldsTab
            fields={fields}
            selectedFieldId={selectedFieldId}
            selectedFieldIds={selectedFieldIds}
            currentPage={currentPage}
            errorFieldIds={errorFieldIds}
            onFieldSelect={onFieldSelect}
            onToggleFieldSelection={onToggleFieldSelection}
            onFieldDelete={onFieldDelete}
            onPageNavigate={onPageNavigate}
            hoveredFieldId={hoveredFieldId}
            onFieldHover={onFieldHover}
          />
        </TabsContent>

        <TabsContent value="json" className="flex-1 overflow-hidden">
          <JsonViewTab fields={fields} />
        </TabsContent>

        <TabsContent value="history" className="flex-1 overflow-hidden">
          <DocumentHistoryTab onLoadFields={handleLoadFieldsFromHistory} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
