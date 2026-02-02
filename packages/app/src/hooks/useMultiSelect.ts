/**
 * useMultiSelect Hook
 * Comprehensive multi-selection functionality
 * Supports keyboard navigation, range selection, and persistence
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

// Types
export interface SelectableItem {
  id: string;
  label?: string;
  group?: string;
  disabled?: boolean;
  [key: string]: any;
}

export interface MultiSelectOptions<T extends SelectableItem> {
  initialSelection?: string[];
  maxSelection?: number;
  minSelection?: number;
  selectableIds?: string[];
  trackOrder?: boolean;
  persistKey?: string;
  onSelectionChange?: (ids: string[], items: T[]) => void;
  onSelect?: (id: string, item: T) => void;
  onDeselect?: (id: string, item: T) => void;
}

export interface MultiSelectReturn<T extends SelectableItem> {
  selectedIds: string[];
  selectedItems: T[];
  focusedId: string | null;
  lastSelectedId: string | null;
  selectionOrder: string[];
  stats: {
    total: number;
    selected: number;
    percentage: number;
  };

  // Selection methods
  select: (id: string) => void;
  deselect: (id: string) => void;
  toggle: (id: string) => void;
  selectMultiple: (ids: string[]) => void;
  deselectMultiple: (ids: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;
  invertSelection: () => void;
  selectGroup: (group: string) => void;
  toggleGroup: (group: string) => void;

  // State checks
  isSelected: (id: string) => boolean;
  canSelect: (id: string) => boolean;
  isAllSelected: () => boolean;
  isPartiallySelected: () => boolean;

  // Event handlers
  handleClick: (id: string, modifiers: { shiftKey?: boolean; ctrlKey?: boolean }) => void;
  handleKeyDown: (key: string, modifiers: { shiftKey?: boolean; ctrlKey?: boolean }) => void;

  // Focus management
  setFocusedId: (id: string | null) => void;
}

/**
 * useMultiSelect Hook Implementation
 */
export function useMultiSelect<T extends SelectableItem>(
  items: T[],
  options: MultiSelectOptions<T> = {}
): MultiSelectReturn<T> {
  const {
    initialSelection = [],
    maxSelection,
    minSelection = 0,
    selectableIds,
    trackOrder = false,
    persistKey,
    onSelectionChange,
    onSelect,
    onDeselect,
  } = options;

  // Load persisted selection
  const loadPersistedSelection = useCallback((): string[] => {
    if (!persistKey) return initialSelection;

    try {
      const saved = localStorage.getItem(persistKey);
      return saved ? JSON.parse(saved) : initialSelection;
    } catch {
      return initialSelection;
    }
  }, [persistKey, initialSelection]);

  // State
  const [selectedIds, setSelectedIds] = useState<string[]>(loadPersistedSelection);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [selectionOrder, setSelectionOrder] = useState<string[]>([]);

  // Refs for callbacks
  const onSelectionChangeRef = useRef(onSelectionChange);
  const onSelectRef = useRef(onSelect);
  const onDeselectRef = useRef(onDeselect);

  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
    onSelectRef.current = onSelect;
    onDeselectRef.current = onDeselect;
  }, [onSelectionChange, onSelect, onDeselect]);

  // Create item map for fast lookup
  const itemMap = useMemo(() => {
    const map = new Map<string, T>();
    items.forEach(item => map.set(item.id, item));
    return map;
  }, [items]);

  // Get selectable items
  const selectableItems = useMemo(() => {
    return items.filter(item => {
      if (item.disabled) return false;
      if (selectableIds && !selectableIds.includes(item.id)) return false;
      return true;
    });
  }, [items, selectableIds]);

  // Get selected items
  const selectedItems = useMemo(() => {
    return selectedIds
      .map(id => itemMap.get(id))
      .filter((item): item is T => item !== undefined);
  }, [selectedIds, itemMap]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = selectableItems.length;
    const selected = selectedIds.length;
    const percentage = total > 0 ? Math.round((selected / total) * 100) : 0;
    return { total, selected, percentage };
  }, [selectableItems, selectedIds]);

  // Persist selection
  useEffect(() => {
    if (persistKey) {
      try {
        localStorage.setItem(persistKey, JSON.stringify(selectedIds));
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [persistKey, selectedIds]);

  // Check if item can be selected
  const canSelect = useCallback((id: string): boolean => {
    const item = itemMap.get(id);
    if (!item || item.disabled) return false;
    if (selectableIds && !selectableIds.includes(id)) return false;
    if (maxSelection && selectedIds.length >= maxSelection && !selectedIds.includes(id)) {
      return false;
    }
    return true;
  }, [itemMap, selectableIds, maxSelection, selectedIds]);

  // Check if item is selected
  const isSelected = useCallback((id: string): boolean => {
    return selectedIds.includes(id);
  }, [selectedIds]);

  // Select single item
  const select = useCallback((id: string) => {
    if (!canSelect(id)) return;

    setSelectedIds(prev => {
      if (prev.includes(id)) return prev;

      let newSelection = [...prev, id];
      if (maxSelection && newSelection.length > maxSelection) {
        newSelection = newSelection.slice(-maxSelection);
      }

      const item = itemMap.get(id);
      if (item) {
        onSelectRef.current?.(id, item);
        onSelectionChangeRef.current?.(newSelection, newSelection.map(id => itemMap.get(id)!));
      }

      return newSelection;
    });

    setLastSelectedId(id);

    if (trackOrder) {
      setSelectionOrder(prev => [...prev, id]);
    }
  }, [canSelect, maxSelection, itemMap, trackOrder]);

  // Deselect single item
  const deselect = useCallback((id: string) => {
    setSelectedIds(prev => {
      if (!prev.includes(id)) return prev;

      const newSelection = prev.filter(selectedId => selectedId !== id);

      if (minSelection && newSelection.length < minSelection) {
        return prev; // Keep minimum selection
      }

      const item = itemMap.get(id);
      if (item) {
        onDeselectRef.current?.(id, item);
        onSelectionChangeRef.current?.(newSelection, newSelection.map(id => itemMap.get(id)!));
      }

      return newSelection;
    });

    if (trackOrder) {
      setSelectionOrder(prev => prev.filter(orderId => orderId !== id));
    }
  }, [minSelection, itemMap, trackOrder]);

  // Toggle selection
  const toggle = useCallback((id: string) => {
    if (isSelected(id)) {
      deselect(id);
    } else {
      select(id);
    }
  }, [isSelected, select, deselect]);

  // Select multiple items
  const selectMultiple = useCallback((ids: string[]) => {
    const validIds = ids.filter(id => canSelect(id));

    setSelectedIds(prev => {
      const newSet = new Set([...prev, ...validIds]);
      let newSelection = Array.from(newSet);

      if (maxSelection && newSelection.length > maxSelection) {
        newSelection = newSelection.slice(0, maxSelection);
      }

      onSelectionChangeRef.current?.(newSelection, newSelection.map(id => itemMap.get(id)!));
      return newSelection;
    });

    if (validIds.length > 0) {
      setLastSelectedId(validIds[validIds.length - 1]);
    }

    if (trackOrder) {
      setSelectionOrder(prev => {
        const newOrder = [...prev];
        validIds.forEach(id => {
          if (!newOrder.includes(id)) {
            newOrder.push(id);
          }
        });
        return newOrder;
      });
    }
  }, [canSelect, maxSelection, itemMap, trackOrder]);

  // Deselect multiple items
  const deselectMultiple = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      const newSelection = prev.filter(id => !ids.includes(id));

      if (minSelection && newSelection.length < minSelection) {
        return prev.slice(0, minSelection);
      }

      onSelectionChangeRef.current?.(newSelection, newSelection.map(id => itemMap.get(id)!));
      return newSelection;
    });

    if (trackOrder) {
      setSelectionOrder(prev => prev.filter(id => !ids.includes(id)));
    }
  }, [minSelection, itemMap, trackOrder]);

  // Select all items
  const selectAll = useCallback(() => {
    const allIds = selectableItems.map(item => item.id);
    selectMultiple(allIds);
  }, [selectableItems, selectMultiple]);

  // Clear selection
  const clearSelection = useCallback(() => {
    if (minSelection > 0) {
      setSelectedIds(prev => prev.slice(0, minSelection));
    } else {
      setSelectedIds([]);
      setSelectionOrder([]);
      onSelectionChangeRef.current?.([], []);
    }
  }, [minSelection]);

  // Invert selection
  const invertSelection = useCallback(() => {
    const allIds = selectableItems.map(item => item.id);
    const newSelection = allIds.filter(id => !selectedIds.includes(id));
    setSelectedIds(newSelection);
    onSelectionChangeRef.current?.(newSelection, newSelection.map(id => itemMap.get(id)!));
  }, [selectableItems, selectedIds, itemMap]);

  // Select group
  const selectGroup = useCallback((group: string) => {
    const groupIds = items
      .filter(item => item.group === group && canSelect(item.id))
      .map(item => item.id);
    selectMultiple(groupIds);
  }, [items, canSelect, selectMultiple]);

  // Toggle group
  const toggleGroup = useCallback((group: string) => {
    const groupIds = items
      .filter(item => item.group === group && canSelect(item.id))
      .map(item => item.id);

    const allSelected = groupIds.every(id => selectedIds.includes(id));

    if (allSelected) {
      deselectMultiple(groupIds);
    } else {
      selectMultiple(groupIds);
    }
  }, [items, canSelect, selectedIds, selectMultiple, deselectMultiple]);

  // Check if all selected
  const isAllSelected = useCallback((): boolean => {
    if (selectableItems.length === 0) return false;
    return selectableItems.every(item => selectedIds.includes(item.id));
  }, [selectableItems, selectedIds]);

  // Check if partially selected
  const isPartiallySelected = useCallback((): boolean => {
    return selectedIds.length > 0 && selectedIds.length < selectableItems.length;
  }, [selectedIds, selectableItems]);

  // Handle click with modifiers
  const handleClick = useCallback((id: string, modifiers: { shiftKey?: boolean; ctrlKey?: boolean }) => {
    const { shiftKey, ctrlKey } = modifiers;

    if (shiftKey && lastSelectedId) {
      // Range selection - replace selection with range
      const lastIndex = items.findIndex(item => item.id === lastSelectedId);
      const currentIndex = items.findIndex(item => item.id === id);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeIds = items.slice(start, end + 1).map(item => item.id);

        // Replace selection with range (not merge)
        setSelectedIds(rangeIds);
        onSelectionChangeRef.current?.(rangeIds, rangeIds.map(id => itemMap.get(id)!));

        if (trackOrder) {
          setSelectionOrder(rangeIds);
        }
      }
    } else if (ctrlKey) {
      // Toggle selection
      toggle(id);
    } else {
      // Single selection
      setSelectedIds([id]);
      setLastSelectedId(id);
      onSelectionChangeRef.current?.([id], [itemMap.get(id)!]);
    }
  }, [lastSelectedId, items, toggle, itemMap, trackOrder]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((key: string, modifiers: { shiftKey?: boolean; ctrlKey?: boolean }) => {
    const { shiftKey, ctrlKey } = modifiers;

    switch (key) {
      case 'a':
        if (ctrlKey) {
          selectAll();
        }
        break;

      case 'Escape':
        clearSelection();
        break;

      case 'ArrowDown':
      case 'ArrowUp':
        if (focusedId) {
          const currentIndex = items.findIndex(item => item.id === focusedId);
          const nextIndex = key === 'ArrowDown'
            ? Math.min(currentIndex + 1, items.length - 1)
            : Math.max(currentIndex - 1, 0);

          const nextId = items[nextIndex]?.id;
          if (nextId) {
            setFocusedId(nextId);

            if (shiftKey) {
              select(nextId);
            }
          }
        }
        break;
    }
  }, [focusedId, items, selectAll, clearSelection, select]);

  return {
    selectedIds,
    selectedItems,
    focusedId,
    lastSelectedId,
    selectionOrder,
    stats,

    select,
    deselect,
    toggle,
    selectMultiple,
    deselectMultiple,
    selectAll,
    clearSelection,
    invertSelection,
    selectGroup,
    toggleGroup,

    isSelected,
    canSelect,
    isAllSelected,
    isPartiallySelected,

    handleClick,
    handleKeyDown,

    setFocusedId,
  };
}