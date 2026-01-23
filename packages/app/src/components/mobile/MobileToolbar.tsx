/**
 * Mobile Toolbar Component
 * Bottom navigation bar for mobile devices
 */

import { useState } from 'react';
import { Type, CheckSquare, PenTool, Camera, Image, MapPin } from 'lucide-react';
import { cn } from '@/utils/cn';

export type ToolType = 'text' | 'checkbox' | 'signature' | 'camera' | 'image' | 'gps';

interface Tool {
  id: ToolType;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  ariaLabel: string;
}

const tools: Tool[] = [
  {
    id: 'text',
    icon: Type,
    label: 'טקסט',
    ariaLabel: 'הוסף שדה טקסט',
  },
  {
    id: 'checkbox',
    icon: CheckSquare,
    label: 'וי',
    ariaLabel: 'הוסף תיבת סימון',
  },
  {
    id: 'signature',
    icon: PenTool,
    label: 'חתימה',
    ariaLabel: 'הוסף שדה חתימה',
  },
  {
    id: 'camera',
    icon: Camera,
    label: 'מצלמה',
    ariaLabel: 'הוסף שדה צילום',
  },
  {
    id: 'image',
    icon: Image,
    label: 'תמונה',
    ariaLabel: 'הוסף תמונה',
  },
  {
    id: 'gps',
    icon: MapPin,
    label: 'מיקום',
    ariaLabel: 'הוסף שדה מיקום',
  },
];

interface MobileToolbarProps {
  /** Currently active tool */
  activeTool?: ToolType | null;
  /** Callback when tool is selected */
  onToolSelect?: (toolId: ToolType) => void;
  /** Additional CSS classes */
  className?: string;
  /** Show labels below icons */
  showLabels?: boolean;
}

/**
 * Mobile Toolbar - Bottom navigation for field tools
 *
 * @example
 * ```tsx
 * <MobileToolbar
 *   activeTool={selectedTool}
 *   onToolSelect={(tool) => setSelectedTool(tool)}
 *   showLabels={true}
 * />
 * ```
 */
export function MobileToolbar({
  activeTool,
  onToolSelect,
  className,
  showLabels = true,
}: MobileToolbarProps) {
  const [selectedTool, setSelectedTool] = useState<ToolType | null>(activeTool || null);

  const handleToolClick = (toolId: ToolType) => {
    setSelectedTool(toolId);
    onToolSelect?.(toolId);

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
        // Layout
        'flex justify-around items-center',
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
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = selectedTool === tool.id;

        return (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            className={cn(
              // Base layout
              'flex flex-col items-center justify-center',
              // Size (44x44 minimum for touch)
              'min-w-[44px] min-h-[44px] w-16 h-16',
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
            <Icon className={cn(
              'w-6 h-6',
              showLabels && 'mb-0.5',
            )} />
            {showLabels && (
              <span className="text-xs font-medium">
                {tool.label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Toolbar spacer to prevent content from being hidden behind the toolbar
 */
export function MobileToolbarSpacer() {
  return <div className="h-16 pb-safe" />;
}
