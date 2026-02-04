/**
 * FloatingNavbar Component
 * Premium editor navigation with tabs and actions toolbar
 * Full RTL support and responsive design
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Edit,
  Eye,
  Settings,
  Save,
  Undo,
  Redo,
  Menu,
  GripVertical,
  X,
  Palette,
  Code,
  Download,
  Upload,
  Share2,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { RTLGuard } from '@/utils/rtl-guard';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

// Types
export interface Tab {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}

export interface Action {
  id: string;
  label: string;
  icon?: string;
  onClick: (id: string) => void;
  shortcut?: string;
  group?: string;
  disabled?: boolean;
  className?: string;
}

export interface FloatingNavbarProps {
  tabs?: Tab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  actions?: Action[];
  position?: { top?: number; left?: number; right?: number; bottom?: number };
  direction?: 'ltr' | 'rtl';
  draggable?: boolean;
  onPositionChange?: (position: { x: number; y: number }) => void;
  autoAdjustPosition?: boolean;
  constrainToViewport?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  customTheme?: {
    background?: string;
    text?: string;
    accent?: string;
  };
  animateOnMount?: boolean;
  className?: string;
}

// Icon mapping
const IconComponents: Record<string, any> = {
  edit: Edit,
  preview: Eye,
  eye: Eye,
  settings: Settings,
  save: Save,
  undo: Undo,
  redo: Redo,
  palette: Palette,
  code: Code,
  download: Download,
  upload: Upload,
  share: Share2,
  publish: Share2,
  sparkles: Sparkles,
  loader: Loader2,
};

// Default tabs
const DEFAULT_TABS: Tab[] = [
  { id: 'edit', label: 'Edit', icon: 'edit' },
  { id: 'preview', label: 'Preview', icon: 'preview' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export const FloatingNavbar: React.FC<FloatingNavbarProps> = ({
  tabs = DEFAULT_TABS,
  activeTab = 'edit',
  onTabChange,
  actions = [],
  position = { top: 20, left: 20 },
  direction = 'ltr',
  draggable = false,
  onPositionChange,
  autoAdjustPosition = false,
  constrainToViewport = true,
  theme = 'light',
  customTheme,
  animateOnMount = false,
  className,
}) => {
  const [currentTab, setCurrentTab] = useState(activeTab);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [navPosition, setNavPosition] = useState(position);
  const [announcement, setAnnouncement] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const rtlGuard = new RTLGuard(direction);

  // Update current tab when prop changes
  useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);

  // Load collapsed state from localStorage
  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem('floatingNavbar_collapsed');
      if (savedCollapsed !== null) {
        setIsCollapsed(savedCollapsed === 'true');
      }
    } catch (error) {
      console.warn('Failed to load collapsed state from localStorage:', error);
    }
  }, []);

  // Save collapsed state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('floatingNavbar_collapsed', String(isCollapsed));
    } catch (error) {
      console.warn('Failed to save collapsed state to localStorage:', error);
    }
  }, [isCollapsed]);

  // Adjust position to stay in viewport
  useEffect(() => {
    if (autoAdjustPosition && navRef.current) {
      const rect = navRef.current.getBoundingClientRect();
      const newPosition = { ...navPosition };
      let changed = false;

      // Prevent top overflow
      if (rect.top < 0) {
        newPosition.top = 0;
        changed = true;
      }

      // Prevent left overflow (in LTR) or right overflow (in RTL)
      if (rtlGuard.isRTL()) {
        // In RTL, check right side
        if (rect.right > window.innerWidth) {
          newPosition.left = window.innerWidth - rect.width - 20;
          changed = true;
        }
        if (rect.left < 0) {
          newPosition.left = rect.width + 20;
          changed = true;
        }
      } else {
        // In LTR, check left side
        if (rect.left < 0) {
          newPosition.left = 0;
          changed = true;
        }
        if (rect.right > window.innerWidth) {
          newPosition.left = window.innerWidth - rect.width - 20;
          changed = true;
        }
      }

      // Prevent bottom overflow
      if (rect.bottom > window.innerHeight) {
        newPosition.top = window.innerHeight - rect.height - 20;
        changed = true;
      }

      // Only update if position actually changed (prevent infinite loop)
      if (changed) {
        setNavPosition(newPosition);
      }
    }
  }, [autoAdjustPosition, navPosition, rtlGuard]);

  // Handle tab selection
  const handleTabSelect = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.disabled) return;

    setCurrentTab(tabId);
    onTabChange?.(tabId);
    setIsMenuOpen(false);

    // Announce tab change for screen readers
    setAnnouncement(`Switched to ${tab?.label} tab`);
  }, [tabs, onTabChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const currentIndex = tabs.findIndex(t => t.id === currentTab);

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        const prevIndex = direction === 'rtl'
          ? (currentIndex + 1) % tabs.length
          : (currentIndex - 1 + tabs.length) % tabs.length;
        handleTabSelect(tabs[prevIndex].id);
        break;
      case 'ArrowRight':
        e.preventDefault();
        const nextIndex = direction === 'rtl'
          ? (currentIndex - 1 + tabs.length) % tabs.length
          : (currentIndex + 1) % tabs.length;
        handleTabSelect(tabs[nextIndex].id);
        break;
    }
  }, [tabs, currentTab, direction, handleTabSelect]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      actions.forEach(action => {
        if (action.shortcut && !action.disabled) {
          const shortcut = action.shortcut.toLowerCase();
          const ctrlMatch = shortcut.includes('ctrl') && e.ctrlKey;
          const keyMatch = shortcut.includes(e.key.toLowerCase());

          if (ctrlMatch && keyMatch) {
            e.preventDefault();
            action.onClick(action.id);
          }
        }
      });
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [actions]);

  // Handle dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!draggable) return;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - (navPosition.left || 0),
      y: e.clientY - (navPosition.top || 0),
    });
  }, [draggable, navPosition]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;

    if (constrainToViewport && navRef.current) {
      const rect = navRef.current.getBoundingClientRect();
      newX = Math.max(0, Math.min(window.innerWidth - rect.width, newX));
      newY = Math.max(0, Math.min(window.innerHeight - rect.height, newY));
    }

    const newPosition = { left: newX, top: newY };
    setNavPosition(newPosition);
    onPositionChange?.({ x: newX, y: newY });
  }, [isDragging, dragOffset, constrainToViewport, onPositionChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Calculate position styles
  // RTL positioning - mirror the position
  // In RTL, if element is at left: 20px in LTR coordinates, it should be right: 20px in RTL
  const positionStyles = rtlGuard.isRTL()
    ? {
        top: navPosition.top,
        right: navPosition.left, // Simply mirror: left becomes right
        left: 'auto',
      }
    : navPosition;

  // Reverse tabs order for RTL visual display
  const displayTabs = rtlGuard.isRTL() ? [...tabs].reverse() : tabs;

  // Group actions
  const groupedActions = actions.reduce((groups, action) => {
    const group = action.group || 'default';
    if (!groups[group]) groups[group] = [];
    groups[group].push(action);
    return groups;
  }, {} as Record<string, Action[]>);

  // Toggle collapse state
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
    setAnnouncement(isCollapsed ? 'Navbar expanded' : 'Navbar collapsed');
  }, [isCollapsed]);

  // Collapsed view - vertical bar with arrow
  if (isCollapsed) {
    // Collapsed bar position - stick to right edge in RTL
    const collapsedBarStyles = rtlGuard.isRTL()
      ? {
          top: navPosition.top,
          right: 0, // Stick to right edge
          left: 'auto',
        }
      : {
          top: navPosition.top,
          left: 0, // Stick to left edge
          right: 'auto',
        };

    return (
      <>
        {/* Screen reader announcements */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement}
        </div>

        <motion.div
          data-testid="collapsed-navbar-bar"
          role="button"
          tabIndex={0}
          aria-label={rtlGuard.isRTL() ? 'הרחב תפריט' : 'Expand navbar'}
          className={cn(
            'fixed z-[1000] bg-white dark:bg-gray-900 rounded-lg shadow-lg',
            'border border-gray-200 dark:border-gray-700',
            'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800',
            'flex items-center justify-center',
            'transition-colors',
            direction === 'rtl' && 'rtl'
          )}
          style={{
            ...collapsedBarStyles,
            width: '30px',
            height: '150px',
            position: 'fixed',
            zIndex: 1000,
          }}
          onClick={toggleCollapse}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleCollapse();
            }
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          {rtlGuard.isRTL() ? (
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" data-icon="chevron-left" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" data-icon="chevron-right" />
          )}
        </motion.div>
      </>
    );
  }

  return (
    <>
      {/* Screen reader announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <motion.nav
        ref={navRef}
        role="navigation"
        aria-label="Editor Navigation"
        className={cn(
          'floating-navbar',
          'fixed z-[1000] bg-white dark:bg-gray-900 rounded-lg shadow-lg',
          'border border-gray-200 dark:border-gray-700',
          direction === 'rtl' && 'rtl',
          theme === 'dark' && 'theme-dark',
          isDragging && 'cursor-move select-none',
          animateOnMount && 'animate-slide-in',
          className
        )}
        style={{
          ...positionStyles,
          position: 'fixed',
          zIndex: 1000,
          backgroundColor: customTheme?.background,
          color: customTheme?.text,
        }}
        initial={animateOnMount ? { opacity: 0, y: -20 } : { opacity: 1 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{
          duration: 0.3,
          ease: 'easeInOut'
        }}
      >
        <div className="flex items-center p-2 gap-2">
          {/* Collapse button */}
          <button
            className={cn(
              'p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors',
              rtlGuard.isRTL() ? 'order-first' : 'order-last'
            )}
            onClick={toggleCollapse}
            aria-label={rtlGuard.isRTL() ? 'סגור תפריט' : 'Collapse navbar'}
            title={rtlGuard.isRTL() ? 'סגור תפריט' : 'Collapse navbar'}
          >
            {rtlGuard.isRTL() ? (
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>

          {/* Drag handle */}
          {draggable && (
            <div
              className={cn(
                'cursor-move p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded',
                rtlGuard.isRTL() ? 'order-last' : 'order-first'
              )}
              onMouseDown={handleMouseDown}
              aria-label="Drag to reposition"
            >
              <GripVertical className="w-4 h-4 text-gray-400" />
            </div>
          )}

          {/* Mobile menu button */}
          {isMobile && (
            <button
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Menu"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          {/* Tabs */}
          {!isMobile && (
            <div className="flex items-center" role="tablist">
              {displayTabs.map((tab, index) => {
                const Icon = IconComponents[tab.icon || 'edit'];
                const isActive = tab.id === currentTab;

                return (
                  <React.Fragment key={tab.id}>
                    <button
                      role="tab"
                      aria-selected={isActive}
                      aria-label={tab.label}
                      title={tab.label}
                      className={cn(
                        'p-2 flex items-center justify-center rounded transition-colors',
                        'hover:bg-gray-100 dark:hover:bg-gray-800',
                        isActive && 'active bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
                        tab.disabled && 'opacity-50 cursor-not-allowed'
                      )}
                      onClick={() => handleTabSelect(tab.id)}
                      onKeyDown={handleKeyDown}
                      disabled={tab.disabled}
                      style={{ display: isMobile && !isMenuOpen ? 'none' : 'flex' }}
                    >
                      {Icon && <Icon className="w-5 h-5" />}
                    </button>

                    {/* Tab indicator */}
                    {isActive && (
                      <motion.div
                        className="absolute bottom-0 h-0.5 bg-blue-600 dark:bg-blue-400 transitioning"
                        layoutId="tab-indicator"
                        data-testid="tab-indicator"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* Actions toolbar */}
          {actions.length > 0 && !isMobile && (
            <>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" role="separator" />
              <div className="flex items-center gap-1">
                {Object.entries(groupedActions).map(([group, groupActions], groupIndex) => (
                  <React.Fragment key={group}>
                    {groupIndex > 0 && (
                      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" role="separator" />
                    )}
                    {groupActions.map(action => {
                      const Icon = IconComponents[action.icon || 'save'];
                      const title = action.shortcut
                        ? `${action.label} (${action.shortcut})`
                        : action.label;

                      return (
                        <button
                          key={action.id}
                          className={cn(
                            'p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800',
                            'transition-colors',
                            action.disabled && 'opacity-50 cursor-not-allowed',
                            action.className,
                          )}
                          onClick={() => !action.disabled && action.onClick(action.id)}
                          aria-label={action.label}
                          title={title}
                          disabled={action.disabled}
                        >
                          {Icon && <Icon className="w-4 h-4" />}
                        </button>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Mobile dropdown menu */}
        <AnimatePresence>
          {isMobile && isMenuOpen && (
            <motion.div
              className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {displayTabs.map(tab => (
                <button
                  key={tab.id}
                  className={cn(
                    'w-full px-4 py-2 text-left rounded transition-colors',
                    'hover:bg-gray-100 dark:hover:bg-gray-800',
                    tab.id === currentTab && 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
                    tab.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => handleTabSelect(tab.id)}
                  disabled={tab.disabled}
                  role="tab"
                  aria-selected={tab.id === currentTab}
                >
                  {tab.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
};