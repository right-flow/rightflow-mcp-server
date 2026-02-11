import { useState, useMemo } from 'react';
import { workflowTemplateService } from '@/services/workflowTemplateService';
import type { WorkflowTemplate, WorkflowCategory, TemplateSortBy } from '@/types/workflow-template';
import { useTranslation } from '@/i18n/useTranslation';
import { Search, Grid, List, Clock, Tag, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';

interface TemplateGalleryProps {
  onSelectTemplate: (template: WorkflowTemplate) => void;
}

export function TemplateGallery({ onSelectTemplate }: TemplateGalleryProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<WorkflowCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<TemplateSortBy>('usage-desc');

  const categories: Array<WorkflowCategory | 'all'> = [
    'all',
    'approval',
    'data-collection',
    'automation',
    'conditional',
    'integration',
    'notification',
    'custom',
  ];

  const templates = useMemo(() => {
    const filtered = workflowTemplateService.getAllWorkflowTemplates({
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      searchQuery: searchQuery || undefined,
    });

    return workflowTemplateService.sortTemplates(filtered, sortBy);
  }, [searchQuery, selectedCategory, sortBy]);

  const storageInfo = workflowTemplateService.getStorageInfo();
  const showStorageWarning = storageInfo.percentage > 80;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('workflow.template.gallery')}</h2>
          {showStorageWarning && (
            <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
              ⚠️ {Math.round(storageInfo.percentage)}% {t('workflow.template.storageUsed')}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as TemplateSortBy)} className="w-48">
            <option value="usage-desc">{t('workflow.template.sort.mostUsed')}</option>
            <option value="usage-asc">{t('workflow.template.sort.leastUsed')}</option>
            <option value="date-desc">{t('workflow.template.sort.newest')}</option>
            <option value="date-asc">{t('workflow.template.sort.oldest')}</option>
            <option value="name-asc">{t('workflow.template.sort.nameAZ')}</option>
            <option value="name-desc">{t('workflow.template.sort.nameZA')}</option>
          </Select>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 rtl:left-auto rtl:right-3" />
        <Input
          type="text"
          placeholder={t('workflow.template.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 rtl:pl-4 rtl:pr-10"
        />
      </div>

      {/* Category Tabs */}
      <Tabs defaultValue="all" value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as WorkflowCategory | 'all')}>
        <TabsList className="w-full overflow-x-auto">
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="flex-shrink-0">
              {t(`workflow.template.category.${cat}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Template Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} onSelect={() => onSelectTemplate(template)} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <TemplateListItem key={template.id} template={template} onSelect={() => onSelectTemplate(template)} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {templates.length === 0 && (
        <div className="py-12 text-center text-gray-500">
          <p className="text-lg font-medium">
            {searchQuery || selectedCategory !== 'all'
              ? t('workflow.template.noResults')
              : t('workflow.template.empty')}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              {t('common.clearSearch')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TemplateCard({ template, onSelect }: { template: WorkflowTemplate; onSelect: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="group rounded-lg border bg-white p-4 transition-all hover:border-blue-500 hover:shadow-md dark:bg-gray-800 dark:hover:border-blue-400">
      {/* Thumbnail */}
      {template.thumbnail && (
        <img
          src={template.thumbnail}
          alt={template.name}
          className="mb-3 h-32 w-full rounded object-cover"
        />
      )}

      {/* Content */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-semibold">{template.name}</h3>
        {template.isSystem && (
          <span className="shrink-0 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            {t('workflow.template.system')}
          </span>
        )}
      </div>

      <p className="mb-3 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
        {template.description}
      </p>

      {/* Metadata */}
      <div className="mb-3 flex flex-wrap gap-2 text-xs text-gray-500">
        {template.usageCount > 0 && (
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {template.usageCount}
          </span>
        )}
        {template.metadata?.estimatedExecutionTime && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(template.metadata.estimatedExecutionTime)}
          </span>
        )}
      </div>

      {/* Tags */}
      <div className="mb-3 flex flex-wrap gap-1">
        {template.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300"
          >
            <Tag className="h-3 w-3" />
            {tag}
          </span>
        ))}
        {template.tags.length > 3 && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            +{template.tags.length - 3}
          </span>
        )}
      </div>

      {/* Actions */}
      <Button onClick={onSelect} className="w-full">
        {t('workflow.template.useTemplate')}
      </Button>
    </div>
  );
}

function TemplateListItem({ template, onSelect }: { template: WorkflowTemplate; onSelect: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between rounded-lg border bg-white p-4 transition-all hover:border-blue-500 dark:bg-gray-800">
      <div className="flex-1">
        <div className="mb-1 flex items-center gap-2">
          <h3 className="font-semibold">{template.name}</h3>
          {template.isSystem && (
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              {t('workflow.template.system')}
            </span>
          )}
          {template.usageCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <TrendingUp className="h-3 w-3" />
              {template.usageCount}
            </span>
          )}
        </div>
        <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">{template.description}</p>
        <div className="flex gap-1">
          {template.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      <Button onClick={onSelect} className="ml-4">
        {t('workflow.template.useTemplate')}
      </Button>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}
