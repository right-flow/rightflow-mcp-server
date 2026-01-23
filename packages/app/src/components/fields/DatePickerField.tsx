/**
 * DatePicker Field Component
 * Provides a date picker for form fields with validation support
 */

import { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { useDirection } from '../../i18n';

interface DatePickerFieldProps {
  field: {
    id: string;
    label?: string;
    name?: string;
    required?: boolean;
    direction?: string;
    validationType?: string;
    validation?: any;
  };
  value: string;
  onChange: (value: string) => void;
}

export function DatePickerField({ field, value, onChange }: DatePickerFieldProps) {
  const direction = useDirection();
  const [showPicker, setShowPicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const pickerRef = useRef<HTMLDivElement>(null);

  // Determine date format based on field direction or global direction
  const isRtl = field.direction === 'rtl' || direction === 'rtl';
  const dateFormat = isRtl ? 'DD/MM/YYYY' : 'MM/DD/YYYY';

  // Get format hint from validation rules
  const getFormatHint = () => {
    if (field.validationType) {
      // Map validation type to format hint
      switch (field.validationType) {
        case 'date.birthdate':
          return isRtl ? `תאריך לידה: ${dateFormat}` : `Birth date: ${dateFormat}`;
        case 'date.signature':
          return isRtl ? `תאריך חתימה: ${dateFormat}` : `Signature date: ${dateFormat}`;
        default:
          return isRtl ? `פורמט: ${dateFormat}` : `Format: ${dateFormat}`;
      }
    }
    return isRtl ? `פורמט: ${dateFormat}` : `Format: ${dateFormat}`;
  };

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    }

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPicker]);

  // Parse date from input value
  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;

    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;

    let day, month, year;
    if (isRtl) {
      // DD/MM/YYYY
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    } else {
      // MM/DD/YYYY
      month = parseInt(parts[0], 10);
      day = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    }

    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    return new Date(year, month - 1, day);
  };

  // Format date for input
  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return isRtl ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
  };

  // Handle date selection from calendar
  const handleDateSelect = (date: Date) => {
    onChange(formatDate(date));
    setShowPicker(false);
  };

  // Generate calendar days
  const generateCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const days = generateCalendar();
  const monthNames = isRtl
    ? ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const dayNames = isRtl
    ? ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const currentDate = parseDate(value);
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return currentDate && date.toDateString() === currentDate.toDateString();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative" ref={pickerRef}>
        <div className="relative flex items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={dateFormat}
            className="flex-1 px-4 py-3 border-2 border-border rounded-lg text-base transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 bg-white"
            required={field.required}
            dir={field.direction || 'ltr'}
          />
          <button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            className="absolute end-2 top-1/2 -translate-y-1/2 p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label={isRtl ? 'בחר תאריך' : 'Select date'}
          >
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {showPicker && (
          <div className="absolute z-50 mt-2 p-4 bg-white rounded-xl shadow-2xl border-2 border-border min-w-[320px]">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                {isRtl ? '◀' : '◀'}
              </button>
              <div className="font-bold text-lg">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </div>
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                {isRtl ? '▶' : '▶'}
              </button>
            </div>

            {/* Day Names */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map((day, idx) => (
                <div key={idx} className="text-center text-xs font-bold text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((date, idx) => {
                if (!date) {
                  return <div key={idx} className="aspect-square" />;
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDateSelect(date)}
                    className={`
                      aspect-square rounded-lg text-sm font-medium transition-all
                      hover:bg-primary hover:text-white
                      ${isSelected(date) ? 'bg-primary text-white' : ''}
                      ${isToday(date) && !isSelected(date) ? 'border-2 border-primary' : ''}
                    `}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Today Button */}
            <div className="mt-4 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => handleDateSelect(new Date())}
                className="w-full py-2 px-4 bg-muted hover:bg-muted/70 rounded-lg text-sm font-medium transition-colors"
              >
                {isRtl ? 'היום' : 'Today'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Format Hint */}
      <div className="text-xs text-muted-foreground">
        {getFormatHint()}
      </div>
    </div>
  );
}
