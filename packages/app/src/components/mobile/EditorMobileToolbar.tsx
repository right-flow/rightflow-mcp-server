/**
 * Editor Mobile Toolbar Component
 * Bottom navigation bar for PDF editor on mobile devices
 */

import {
  Type,
  CheckSquare,
  Circle,
  ChevronDown,
  PenTool,
  FileText,
  MousePointer2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { ToolMode } from '@/types/fields';
import { useTranslation } from '@/i18n';

interface EditorMobileToolbarProps {
  /** Currently active tool */
  activeTool?: ToolMode;
  /** Callback when tool is selected */
  onToolChange?: (tool: ToolMode) => void;
  /** Additional CSS classes */
  className?: string;
  /** Show labels below icons */
  showLabels?: boolean;
}

/**
 * Editor Mobile Toolbar - Bottom navigation for PDF editor tools
 *
 * @example
 * ```tsx
 * <EditorMobileToolbar
 *   activeTool={activeTool}
 *   onToolChange={(tool) => setActiveTool(tool)}
 *   showLabels={true}
 * />
 * ```
 */
export function EditorMobileToolbar({
  activeTool,
  onToolChange,
  className,
  showLabels = true,
}: EditorMobileToolbarProps) {
  const t = useTranslation();

  const tools = [
    { id: 'select' as const, icon: MousePointer2, label: t.selectTool || 'בחר', ariaLabel: 'כלי בחירה' },
    { id: 'text-field' as const, icon: Type, label: 'טקסט', ariaLabel: 'הוסף שדה טקסט' },
    { id: 'checkbox-field' as const, icon: CheckSquare, label: 'וי', ariaLabel: 'הוסף תיבת סימון' },
    { id: 'radio-field' as const, icon: Circle, label: 'רדיו', ariaLabel: 'הוסף כפתור רדיו' },
    { id: 'dropdown-field' as const, icon: ChevronDown, label: 'רשימה', ariaLabel: 'הוסף רשימה נפתחת' },
    { id: 'signature-field' as const, icon: PenTool, label: 'חתימה', ariaLabel: 'הוסף שדה חתימה' },
    { id: 'static-text-field' as const, icon: FileText, label: 'טקסט קבוע', ariaLabel: 'הוסף טקסט קבוע' },
  ];

  const handleToolClick = (toolId: ToolMode) => {
    onToolChange?.(toolId);

    // Haptic feedback on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  return (
    <nav
      className={cn(
        // Base styles
        'fixed bottom-0 left-0 right-0 z-50',
        // Background and border
        'bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800',
        // Layout - horizontal scroll for many tools
        'flex overflow-x-auto',
        // Height
        'h-16',
        // Safe area for iOS
        'pb-safe',
        // Shadow
        'shadow-lg',
        className,
      )}
      role="toolbar"
      aria-label="כלי עריכה"
    >
      <div className="flex justify-around items-center w-full min-w-max px-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool.id)}
              className={cn(
                // Base layout
                'flex flex-col items-center justify-center',
                // Size (44x44 minimum for touch)
                'min-w-[44px] min-h-[44px] w-14 h-14',
                // Rounded
                'rounded-lg',
                // Transitions
                'transition-all duration-200',
                // Colors
                isActive
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400',
                // Hover (desktop)
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                // Active state (touch feedback)
                'active:scale-95 active:bg-gray-200 dark:active:bg-gray-700',
                // Focus
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              )}
              aria-label={tool.ariaLabel}
              aria-pressed={isActive}
              type="button"
            >
              <Icon className={cn('w-5 h-5', showLabels && 'mb-0.5')} />
              {showLabels && (
                <span className="text-[10px] font-medium whitespace-nowrap">
                  {tool.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Toolbar spacer to prevent content from being hidden behind the toolbar
 */
export function EditorMobileToolbarSpacer() {
  return <div className="h-16 pb-safe" />;
}
