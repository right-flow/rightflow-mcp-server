/**
 * Date Picker JavaScript
 * Calendar-based date picker with Hebrew support
 */

/**
 * Generates JavaScript for date picker functionality
 */
export function generateDatePickerJs(): string {
  return `
  // ========================================
  // Date Picker Functionality
  // ========================================

  const HEBREW_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const HEBREW_DAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

  const datePickers = [];
  const dateWrappers = form.querySelectorAll('.date-picker-wrapper');

  dateWrappers.forEach(function(wrapper) {
    const input = wrapper.querySelector('.date-input');
    const button = wrapper.querySelector('.date-picker-btn');
    const calendar = wrapper.querySelector('.date-picker-calendar');

    if (!input || !button || !calendar) return;

    let currentDate = new Date();
    let selectedDate = null;

    // Format date as dd/mm/yyyy
    function formatDate(date) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return day + '/' + month + '/' + year;
    }

    // Parse dd/mm/yyyy to Date
    // BUG FIX: Added comprehensive date validation
    // Date: 2026-01-04
    // Issue: Function allowed invalid dates (month=0, day=40, negative years)
    //        causing array out of bounds access for HEBREW_MONTHS[month]
    // Fix: Added range validation and actual date validity check
    // Context: Documents/Fixes/date-validation-parsedate-fix.md
    // Prevention: Added unit tests for edge cases
    function parseDate(str) {
      const parts = str.split('/');
      if (parts.length !== 3) return null;

      const day = parseInt(parts[0], 10);
      const monthInput = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);

      // Validate parsing succeeded
      if (isNaN(day) || isNaN(monthInput) || isNaN(year)) return null;

      // Validate ranges BEFORE using values
      // Month: 1-12 (user input), converted to 0-11 for Date object
      if (monthInput < 1 || monthInput > 12) return null;

      // Day: 1-31 (basic range, actual validity checked below)
      if (day < 1 || day > 31) return null;

      // Year: reasonable range to prevent obvious errors
      if (year < 1900 || year > 2100) return null;

      // Convert month to 0-indexed for Date object
      const month = monthInput - 1;

      // Create date and verify it's actually valid
      // JavaScript Date auto-corrects invalid dates (e.g., Feb 30 becomes Mar 2)
      // so we check that the created date matches our input
      const date = new Date(year, month, day);

      // Verify the date components match what we put in
      // This catches cases like Feb 30, Apr 31, etc.
      if (date.getFullYear() !== year ||
          date.getMonth() !== month ||
          date.getDate() !== day) {
        return null;
      }

      return date;
    }

    // Render calendar
    function renderCalendar() {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      // Header
      let html = '<div class="date-picker-header">';
      html += '<button type="button" class="date-picker-nav" data-action="prev">◀</button>';
      html += '<div class="date-picker-current">' + HEBREW_MONTHS[month] + ' ' + year + '</div>';
      html += '<button type="button" class="date-picker-nav" data-action="next">▶</button>';
      html += '</div>';

      // Grid
      html += '<div class="date-picker-grid">';

      // Day headers
      for (var i = 0; i < 7; i++) {
        html += '<div class="date-picker-day-header">' + HEBREW_DAYS[i] + '</div>';
      }

      // Calculate first day of month
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      // Empty cells before first day
      for (var i = 0; i < firstDay; i++) {
        html += '<button type="button" class="date-picker-day empty" disabled></button>';
      }

      // Days
      const today = new Date();
      for (var day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const isToday = date.toDateString() === today.toDateString();
        const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();

        var classes = 'date-picker-day';
        if (isToday) classes += ' today';
        if (isSelected) classes += ' selected';

        html += '<button type="button" class="' + classes + '" data-day="' + day + '">' + day + '</button>';
      }

      html += '</div>';
      calendar.innerHTML = html;

      // Attach event listeners
      calendar.querySelectorAll('.date-picker-nav').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          const action = this.dataset.action;
          if (action === 'prev') {
            currentDate.setMonth(currentDate.getMonth() - 1);
          } else if (action === 'next') {
            currentDate.setMonth(currentDate.getMonth() + 1);
          }
          renderCalendar();
        });
      });

      calendar.querySelectorAll('.date-picker-day:not(.empty)').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          const day = parseInt(this.dataset.day, 10);
          selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          input.value = formatDate(selectedDate);
          calendar.style.display = 'none';
        });
      });
    }

    // Toggle calendar
    button.addEventListener('click', function(e) {
      e.stopPropagation();
      const isVisible = calendar.style.display !== 'none';

      // Close all other calendars
      document.querySelectorAll('.date-picker-calendar').forEach(function(cal) {
        cal.style.display = 'none';
      });

      if (!isVisible) {
        // Parse current input value
        const parsed = parseDate(input.value);
        if (parsed) {
          currentDate = new Date(parsed);
          selectedDate = parsed;
        } else {
          currentDate = new Date();
          selectedDate = null;
        }
        renderCalendar();
        calendar.style.display = 'block';
      }
    });

    // Manual input validation
    input.addEventListener('blur', function() {
      const parsed = parseDate(this.value);
      if (parsed) {
        selectedDate = parsed;
        this.value = formatDate(parsed);
      }
    });

    // Close calendar when clicking outside
    document.addEventListener('click', function(e) {
      if (!wrapper.contains(e.target)) {
        calendar.style.display = 'none';
      }
    });

    datePickers.push({
      input: input,
      wrapper: wrapper,
      getDate: function() { return selectedDate; }
    });
  });
`;
}
