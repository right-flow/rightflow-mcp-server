/**
 * useMultiSelect Hook Tests
 * Test-Driven Development for multi-selection functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMultiSelect } from './useMultiSelect';

describe('useMultiSelect', () => {
  const items = [
    { id: '1', label: 'Item 1' },
    { id: '2', label: 'Item 2' },
    { id: '3', label: 'Item 3' },
    { id: '4', label: 'Item 4' },
    { id: '5', label: 'Item 5' },
  ];

  describe('Basic Selection', () => {
    it('should initialize with empty selection', () => {
      const { result } = renderHook(() => useMultiSelect(items));

      expect(result.current.selectedIds).toEqual([]);
      expect(result.current.selectedItems).toEqual([]);
      expect(result.current.isSelected('1')).toBe(false);
    });

    it('should initialize with initial selection', () => {
      const { result } = renderHook(() =>
        useMultiSelect(items, { initialSelection: ['1', '3'] })
      );

      expect(result.current.selectedIds).toEqual(['1', '3']);
      expect(result.current.selectedItems).toHaveLength(2);
      expect(result.current.isSelected('1')).toBe(true);
      expect(result.current.isSelected('3')).toBe(true);
    });

    it('should select single item', () => {
      const { result } = renderHook(() => useMultiSelect(items));

      act(() => {
        result.current.select('2');
      });

      expect(result.current.selectedIds).toEqual(['2']);
      expect(result.current.isSelected('2')).toBe(true);
    });

    it('should deselect item', () => {
      const { result } = renderHook(() =>
        useMultiSelect(items, { initialSelection: ['1', '2'] })
      );

      act(() => {
        result.current.deselect('1');
      });

      expect(result.current.selectedIds).toEqual(['2']);
      expect(result.current.isSelected('1')).toBe(false);
    });

    it('should toggle selection', () => {
      const { result } = renderHook(() => useMultiSelect(items));

      act(() => {
        result.current.toggle('1');
      });
      expect(result.current.isSelected('1')).toBe(true);

      act(() => {
        result.current.toggle('1');
      });
      expect(result.current.isSelected('1')).toBe(false);
    });
  });

  describe('Multiple Selection', () => {
    it('should select multiple items', () => {
      const { result } = renderHook(() => useMultiSelect(items));

      act(() => {
        result.current.selectMultiple(['1', '3', '5']);
      });

      expect(result.current.selectedIds).toEqual(['1', '3', '5']);
      expect(result.current.selectedItems).toHaveLength(3);
    });

    it('should deselect multiple items', () => {
      const { result } = renderHook(() =>
        useMultiSelect(items, { initialSelection: ['1', '2', '3', '4'] })
      );

      act(() => {
        result.current.deselectMultiple(['2', '4']);
      });

      expect(result.current.selectedIds).toEqual(['1', '3']);
    });

    it('should select all items', () => {
      const { result } = renderHook(() => useMultiSelect(items));

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedIds).toHaveLength(5);
      expect(result.current.isAllSelected()).toBe(true);
    });

    it('should clear selection', () => {
      const { result } = renderHook(() =>
        useMultiSelect(items, { initialSelection: ['1', '2', '3'] })
      );

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedIds).toEqual([]);
      expect(result.current.selectedItems).toEqual([]);
    });
  });

  describe('Range Selection', () => {
    it('should select range with Shift key', () => {
      const { result } = renderHook(() => useMultiSelect(items));

      act(() => {
        result.current.handleClick('2', { shiftKey: false });
      });

      act(() => {
        result.current.handleClick('4', { shiftKey: true });
      });

      expect(result.current.selectedIds).toEqual(['2', '3', '4']);
    });

    it('should handle reverse range selection', () => {
      const { result } = renderHook(() => useMultiSelect(items));

      act(() => {
        result.current.handleClick('4', { shiftKey: false });
      });

      act(() => {
        result.current.handleClick('2', { shiftKey: true });
      });

      expect(result.current.selectedIds).toEqual(['2', '3', '4']);
    });

    it('should extend selection with Ctrl/Cmd', () => {
      const { result } = renderHook(() => useMultiSelect(items));

      act(() => {
        result.current.handleClick('1', { ctrlKey: false });
      });

      act(() => {
        result.current.handleClick('3', { ctrlKey: true });
      });

      act(() => {
        result.current.handleClick('5', { ctrlKey: true });
      });

      expect(result.current.selectedIds).toEqual(['1', '3', '5']);
    });

    it('should deselect with Ctrl/Cmd on selected item', () => {
      const { result } = renderHook(() =>
        useMultiSelect(items, { initialSelection: ['1', '2', '3'] })
      );

      act(() => {
        result.current.handleClick('2', { ctrlKey: true });
      });

      expect(result.current.selectedIds).toEqual(['1', '3']);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle arrow key navigation', () => {
      const { result } = renderHook(() => useMultiSelect(items));

      act(() => {
        result.current.select('2');
        result.current.setFocusedId('2');
      });

      act(() => {
        result.current.handleKeyDown('ArrowDown', { shiftKey: false });
      });

      expect(result.current.focusedId).toBe('3');
    });

    it('should extend selection with Shift+Arrow', () => {
      const { result } = renderHook(() => useMultiSelect(items));

      act(() => {
        result.current.select('2');
        result.current.setFocusedId('2');
      });

      act(() => {
        result.current.handleKeyDown('ArrowDown', { shiftKey: true });
      });

      expect(result.current.selectedIds).toEqual(['2', '3']);
      expect(result.current.focusedId).toBe('3');
    });

    it('should select all with Ctrl+A', () => {
      const { result } = renderHook(() => useMultiSelect(items));

      act(() => {
        result.current.handleKeyDown('a', { ctrlKey: true });
      });

      expect(result.current.selectedIds).toHaveLength(5);
      expect(result.current.isAllSelected()).toBe(true);
    });

    it('should clear selection with Escape', () => {
      const { result } = renderHook(() =>
        useMultiSelect(items, { initialSelection: ['1', '2', '3'] })
      );

      act(() => {
        result.current.handleKeyDown('Escape', {});
      });

      expect(result.current.selectedIds).toEqual([]);
    });
  });

  describe('Selection Constraints', () => {
    it('should enforce max selection limit', () => {
      const { result } = renderHook(() =>
        useMultiSelect(items, { maxSelection: 3 })
      );

      act(() => {
        result.current.selectMultiple(['1', '2', '3', '4', '5']);
      });

      expect(result.current.selectedIds).toHaveLength(3);
      expect(result.current.canSelect('4')).toBe(false);
    });

    it('should enforce min selection', () => {
      const { result } = renderHook(() =>
        useMultiSelect(items, {
          initialSelection: ['1', '2'],
          minSelection: 1,
        })
      );

      act(() => {
        result.current.deselect('1');
      });
      expect(result.current.selectedIds).toEqual(['2']);

      act(() => {
        result.current.deselect('2');
      });
      expect(result.current.selectedIds).toEqual(['2']); // Should keep at least 1
    });

    it('should allow only certain items to be selected', () => {
      const { result } = renderHook(() =>
        useMultiSelect(items, {
          selectableIds: ['1', '3', '5'],
        })
      );

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedIds).toEqual(['1', '3', '5']);
    });

    it('should prevent disabled items from selection', () => {
      const itemsWithDisabled = items.map(item => ({
        ...item,
        disabled: item.id === '2' || item.id === '4',
      }));

      const { result } = renderHook(() => useMultiSelect(itemsWithDisabled));

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedIds).toEqual(['1', '3', '5']);
    });
  });

  describe('Selection Groups', () => {
    it('should select group of items', () => {
      const groupedItems = items.map(item => ({
        ...item,
        group: item.id <= '3' ? 'group1' : 'group2',
      }));

      const { result } = renderHook(() => useMultiSelect(groupedItems));

      act(() => {
        result.current.selectGroup('group1');
      });

      expect(result.current.selectedIds).toEqual(['1', '2', '3']);
    });

    it('should toggle group selection', () => {
      const groupedItems = items.map(item => ({
        ...item,
        group: item.id <= '3' ? 'group1' : 'group2',
      }));

      const { result } = renderHook(() => useMultiSelect(groupedItems));

      act(() => {
        result.current.toggleGroup('group1');
      });
      expect(result.current.selectedIds).toEqual(['1', '2', '3']);

      act(() => {
        result.current.toggleGroup('group1');
      });
      expect(result.current.selectedIds).toEqual([]);
    });
  });

  describe('Selection State', () => {
    it('should track selection order', () => {
      const { result } = renderHook(() =>
        useMultiSelect(items, { trackOrder: true })
      );

      act(() => {
        result.current.select('3');
        result.current.select('1');
        result.current.select('2');
      });

      expect(result.current.selectionOrder).toEqual(['3', '1', '2']);
    });

    it('should provide selection statistics', () => {
      const { result } = renderHook(() =>
        useMultiSelect(items, { initialSelection: ['1', '2', '3'] })
      );

      expect(result.current.stats).toEqual({
        total: 5,
        selected: 3,
        percentage: 60,
      });
    });

    it('should track last selected item', () => {
      const { result } = renderHook(() => useMultiSelect(items));

      act(() => {
        result.current.select('2');
      });
      expect(result.current.lastSelectedId).toBe('2');

      act(() => {
        result.current.select('4');
      });
      expect(result.current.lastSelectedId).toBe('4');
    });
  });

  describe('Selection Persistence', () => {
    it('should save selection to localStorage', () => {
      const { result } = renderHook(() =>
        useMultiSelect(items, { persistKey: 'test-selection' })
      );

      act(() => {
        result.current.selectMultiple(['1', '3']);
      });

      const saved = localStorage.getItem('test-selection');
      expect(JSON.parse(saved!)).toEqual(['1', '3']);
    });

    it('should restore selection from localStorage', () => {
      localStorage.setItem('test-selection', JSON.stringify(['2', '4']));

      const { result } = renderHook(() =>
        useMultiSelect(items, { persistKey: 'test-selection' })
      );

      expect(result.current.selectedIds).toEqual(['2', '4']);
    });
  });

  describe('Callbacks', () => {
    it('should call onSelectionChange', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useMultiSelect(items, { onSelectionChange })
      );

      act(() => {
        result.current.select('1');
      });

      expect(onSelectionChange).toHaveBeenCalledWith(['1'], expect.any(Object));
    });

    it('should call onSelect callback', () => {
      const onSelect = vi.fn();
      const { result } = renderHook(() => useMultiSelect(items, { onSelect }));

      act(() => {
        result.current.select('2');
      });

      expect(onSelect).toHaveBeenCalledWith('2', expect.any(Object));
    });

    it('should call onDeselect callback', () => {
      const onDeselect = vi.fn();
      const { result } = renderHook(() =>
        useMultiSelect(items, {
          initialSelection: ['1'],
          onDeselect,
        })
      );

      act(() => {
        result.current.deselect('1');
      });

      expect(onDeselect).toHaveBeenCalledWith('1', expect.any(Object));
    });
  });

  describe('Utility Functions', () => {
    it('should get selected items', () => {
      const { result } = renderHook(() =>
        useMultiSelect(items, { initialSelection: ['1', '3'] })
      );

      const selected = result.current.selectedItems;
      expect(selected).toHaveLength(2);
      expect(selected[0].label).toBe('Item 1');
      expect(selected[1].label).toBe('Item 3');
    });

    it('should invert selection', () => {
      const { result } = renderHook(() =>
        useMultiSelect(items, { initialSelection: ['1', '2'] })
      );

      act(() => {
        result.current.invertSelection();
      });

      expect(result.current.selectedIds).toEqual(['3', '4', '5']);
    });

    it('should check if partially selected', () => {
      const { result } = renderHook(() =>
        useMultiSelect(items, { initialSelection: ['1', '2'] })
      );

      expect(result.current.isPartiallySelected()).toBe(true);
      expect(result.current.isAllSelected()).toBe(false);

      act(() => {
        result.current.clearSelection();
      });
      expect(result.current.isPartiallySelected()).toBe(false);
    });
  });
});