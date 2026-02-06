/**
 * QuickStartCard Component
 * Empty state component showing template gallery for quick form creation
 * Date: 2026-02-06
 */

import { getAllTemplates } from '@/data/formTemplates';

export interface QuickStartCardProps {
  onTemplateSelect: (templateId: string) => void;
  onCreateBlank: () => void;
}

export function QuickStartCard({ onTemplateSelect, onCreateBlank }: QuickStartCardProps) {
  const templates = getAllTemplates();

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-8">
      {/* Main Heading */}
      <div className="text-center mb-12">
        <div className="text-5xl mb-4">🎯</div>
        <h2 className="text-3xl font-bold text-foreground mb-2">
          Create your first form in 2 minutes
        </h2>
        <p className="text-muted-foreground text-lg">
          Choose a template below to get started quickly
        </p>
      </div>

      {/* Template Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl mb-8">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onTemplateSelect(template.id)}
            className="flex flex-col items-center p-6 bg-white dark:bg-zinc-900 border-2 border-border rounded-xl hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer group"
          >
            {/* Icon */}
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-200">
              {template.icon}
            </div>

            {/* Title (Hebrew) */}
            <h3 className="font-semibold text-foreground text-center mb-2">
              {template.nameHe}
            </h3>

            {/* Description (Hebrew) */}
            <p className="text-sm text-muted-foreground text-center">
              {template.descriptionHe}
            </p>
          </button>
        ))}
      </div>

      {/* Start from Scratch Button */}
      <button
        onClick={onCreateBlank}
        className="text-primary hover:text-primary/80 font-medium flex items-center gap-2 transition-colors"
      >
        Or start from scratch →
      </button>
    </div>
  );
}
