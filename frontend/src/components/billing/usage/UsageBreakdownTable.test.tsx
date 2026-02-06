// UsageBreakdownTable Component Tests
// Created: 2026-02-05
// Purpose: Test usage breakdown table with sorting and filtering

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UsageBreakdownTable } from './UsageBreakdownTable';
import { UsageDetails, UsageEntry } from '../../../api/types';

const mockUsageEntries: UsageEntry[] = [
  {
    date: '2026-02-01',
    formsCreated: 2,
    submissions: 10,
    storageUsedMB: 5.5,
  },
  {
    date: '2026-02-02',
    formsCreated: 1,
    submissions: 15,
    storageUsedMB: 3.2,
  },
  {
    date: '2026-02-03',
    formsCreated: 0,
    submissions: 8,
    storageUsedMB: 1.8,
  },
  {
    date: '2026-02-04',
    formsCreated: 3,
    submissions: 20,
    storageUsedMB: 7.1,
  },
];

const mockUsageDetails: UsageDetails = {
  dailyBreakdown: mockUsageEntries,
};

describe('UsageBreakdownTable', () => {
  describe('Rendering', () => {
    it('renders with usage data', () => {
      render(<UsageBreakdownTable usageDetails={mockUsageDetails} />);

      expect(screen.getByText('Usage Breakdown')).toBeInTheDocument();
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('shows loading skeleton when loading', () => {
      render(<UsageBreakdownTable usageDetails={null} loading={true} />);

      const skeleton = screen.getByRole('generic', { hidden: true });
      expect(skeleton.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('shows no data state when usageDetails is null', () => {
      render(<UsageBreakdownTable usageDetails={null} />);

      expect(screen.getByText('No usage data available')).toBeInTheDocument();
    });

    it('shows no data state when dailyBreakdown is empty', () => {
      render(<UsageBreakdownTable usageDetails={{ dailyBreakdown: [] }} />);

      expect(screen.getByText('No usage data available')).toBeInTheDocument();
    });
  });

  describe('Table Headers', () => {
    it('displays all column headers', () => {
      render(<UsageBreakdownTable usageDetails={mockUsageDetails} />);

      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Forms Created')).toBeInTheDocument();
      expect(screen.getByText('Submissions')).toBeInTheDocument();
      expect(screen.getByText('Storage (MB)')).toBeInTheDocument();
    });

    it('displays sort indicators on all headers', () => {
      const { container } = render(<UsageBreakdownTable usageDetails={mockUsageDetails} />);

      const sortIcons = container.querySelectorAll('svg');
      expect(sortIcons.length).toBeGreaterThanOrEqual(4); // At least one per column
    });
  });

  describe('Table Data', () => {
    it('displays all data rows', () => {
      render(<UsageBreakdownTable usageDetails={mockUsageDetails} />);

      const rows = screen.getAllByRole('row');
      // +2 for header and footer rows
      expect(rows).toHaveLength(mockUsageEntries.length + 2);
    });

    it('formats dates correctly', () => {
      render(<UsageBreakdownTable usageDetails={mockUsageDetails} />);

      expect(screen.getByText(/Feb 1, 2026/)).toBeInTheDocument();
      expect(screen.getByText(/Feb 2, 2026/)).toBeInTheDocument();
    });

    it('displays numeric values correctly', () => {
      render(<UsageBreakdownTable usageDetails={mockUsageDetails} />);

      expect(screen.getByText('2')).toBeInTheDocument(); // formsCreated
      expect(screen.getByText('10')).toBeInTheDocument(); // submissions
      expect(screen.getByText('5.50')).toBeInTheDocument(); // storageUsedMB
    });

    it('displays totals row', () => {
      render(<UsageBreakdownTable usageDetails={mockUsageDetails} />);

      expect(screen.getByText(/Total \(4 days\)/)).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument(); // total forms
      expect(screen.getByText('53')).toBeInTheDocument(); // total submissions
      expect(screen.getByText('17.60')).toBeInTheDocument(); // total storage
    });
  });

  describe('Date Range Filtering', () => {
    it('shows 7/30/90 days filter buttons', () => {
      render(<UsageBreakdownTable usageDetails={mockUsageDetails} />);

      expect(screen.getByRole('button', { name: /7 days/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /30 days/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /90 days/i })).toBeInTheDocument();
    });

    it('defaults to 30 days filter', () => {
      render(<UsageBreakdownTable usageDetails={mockUsageDetails} />);

      const button30Days = screen.getByRole('button', { name: /30 days/i });
      expect(button30Days).toHaveClass('bg-blue-100');
    });

    it('highlights selected filter button', () => {
      render(<UsageBreakdownTable usageDetails={mockUsageDetails} />);

      const button7Days = screen.getByRole('button', { name: /7 days/i });
      fireEvent.click(button7Days);

      expect(button7Days).toHaveClass('bg-blue-100');
    });

    it('filters data when 7 days selected', () => {
      const entriesOverRange: UsageEntry[] = [
        { date: '2026-01-01', formsCreated: 1, submissions: 5, storageUsedMB: 2.0 }, // 35 days ago
        { date: '2026-02-03', formsCreated: 2, submissions: 10, storageUsedMB: 3.0 }, // recent
        { date: '2026-02-04', formsCreated: 3, submissions: 15, storageUsedMB: 4.0 }, // recent
      ];

      render(<UsageBreakdownTable usageDetails={{ dailyBreakdown: entriesOverRange }} />);

      const button7Days = screen.getByRole('button', { name: /7 days/i });
      fireEvent.click(button7Days);

      // Old entry should be filtered out
      expect(screen.queryByText(/Jan 1/)).not.toBeInTheDocument();
      // Recent entries should be visible
      expect(screen.getByText(/Feb 3/)).toBeInTheDocument();
      expect(screen.getByText(/Feb 4/)).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('sorts by date descending by default', () => {
      render(<UsageBreakdownTable usageDetails={mockUsageDetails} />);

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1]; // Skip header
      expect(firstDataRow).toHaveTextContent(/Feb 4, 2026/); // Latest date
    });

    it('sorts by date ascending when clicked once', () => {
      render(<UsageBreakdownTable usageDetails={mockUsageDetails} />);

      const dateHeader = screen.getByText('Date').closest('th')!;
      fireEvent.click(dateHeader);

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      expect(firstDataRow).toHaveTextContent(/Feb 1, 2026/); // Earliest date
    });

    it('sorts by forms created ascending', () => {
      render(<UsageBreakdownTable usageDetails={mockUsageDetails} />);

      const formsHeader = screen.getByText('Forms Created').closest('th')!;
      fireEvent.click(formsHeader);

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      expect(firstDataRow).toHaveTextContent(/Feb 3/); // 0 forms
    });

    it('sorts by forms created descending', () => {
      render(<UsageBreakdownTable usageDetails={mockUsageDetails} />);

      const formsHeader = screen.getByText('Forms Created').closest('th')!;
      fireEvent.click(formsHeader); // asc
      fireEvent.click(formsHeader); // desc

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      expect(firstDataRow).toHaveTextContent(/Feb 4/); // 3 forms
    });

    it('sorts by submissions', () => {
      render(<UsageBreakdownTable usageDetails={mockUsageDetails} />);

      const submissionsHeader = screen.getByText('Submissions').closest('th')!;
      fireEvent.click(submissionsHeader);

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      expect(firstDataRow).toHaveTextContent(/Feb 3/); // 8 submissions (lowest)
    });

    it('sorts by storage', () => {
      render(<UsageBreakdownTable usageDetails={mockUsageDetails} />);

      const storageHeader = screen.getByText('Storage (MB)').closest('th')!;
      fireEvent.click(storageHeader);

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      expect(firstDataRow).toHaveTextContent(/1.80/); // Lowest storage
    });

    it('updates sort indicator when column clicked', () => {
      const { container } = render(<UsageBreakdownTable usageDetails={mockUsageDetails} />);

      const formsHeader = screen.getByText('Forms Created').closest('th')!;
      fireEvent.click(formsHeader);

      // Check that sort indicator changed (blue color for active sort)
      const sortIcon = formsHeader.querySelector('svg');
      expect(sortIcon).toHaveClass('text-blue-600');
    });
  });

  describe('Totals Calculation', () => {
    it('calculates totals correctly for filtered data', () => {
      render(<UsageBreakdownTable usageDetails={mockUsageDetails} />);

      expect(screen.getByText('6')).toBeInTheDocument(); // 2+1+0+3
      expect(screen.getByText('53')).toBeInTheDocument(); // 10+15+8+20
      expect(screen.getByText('17.60')).toBeInTheDocument(); // 5.5+3.2+1.8+7.1
    });

    it('updates totals when filter changes', () => {
      const entriesOverRange: UsageEntry[] = [
        { date: '2026-01-01', formsCreated: 10, submissions: 100, storageUsedMB: 50.0 },
        { date: '2026-02-04', formsCreated: 2, submissions: 20, storageUsedMB: 5.0 },
      ];

      render(<UsageBreakdownTable usageDetails={{ dailyBreakdown: entriesOverRange }} />);

      const button7Days = screen.getByRole('button', { name: /7 days/i });
      fireEvent.click(button7Days);

      // Should only include Feb 4 entry
      expect(screen.getByText('2')).toBeInTheDocument(); // forms
      expect(screen.getByText('20')).toBeInTheDocument(); // submissions
      expect(screen.getByText('5.00')).toBeInTheDocument(); // storage
    });

    it('shows correct day count in totals', () => {
      render(<UsageBreakdownTable usageDetails={mockUsageDetails} />);

      expect(screen.getByText(/Total \(4 days\)/)).toBeInTheDocument();
    });
  });

  describe('Alternating Row Colors', () => {
    it('applies alternating background colors', () => {
      const { container } = render(<UsageBreakdownTable usageDetails={mockUsageDetails} />);

      const rows = container.querySelectorAll('tbody tr');
      expect(rows[0]).toHaveClass('bg-white');
      expect(rows[1]).toHaveClass('bg-gray-50');
      expect(rows[2]).toHaveClass('bg-white');
      expect(rows[3]).toHaveClass('bg-gray-50');
    });
  });

  describe('Custom Class Name', () => {
    it('applies custom className', () => {
      const { container } = render(
        <UsageBreakdownTable usageDetails={mockUsageDetails} className="custom-class" />
      );

      const table = container.firstChild;
      expect(table).toHaveClass('custom-class');
    });
  });

  describe('Edge Cases', () => {
    it('handles single entry', () => {
      const singleEntry: UsageDetails = {
        dailyBreakdown: [mockUsageEntries[0]],
      };

      render(<UsageBreakdownTable usageDetails={singleEntry} />);

      expect(screen.getByText(/Total \(1 days\)/)).toBeInTheDocument();
    });

    it('handles entries with zero values', () => {
      const zeroEntry: UsageDetails = {
        dailyBreakdown: [
          { date: '2026-02-01', formsCreated: 0, submissions: 0, storageUsedMB: 0 },
        ],
      };

      render(<UsageBreakdownTable usageDetails={zeroEntry} />);

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('0.00')).toBeInTheDocument();
    });

    it('handles large numbers', () => {
      const largeEntry: UsageDetails = {
        dailyBreakdown: [
          { date: '2026-02-01', formsCreated: 999, submissions: 99999, storageUsedMB: 9999.99 },
        ],
      };

      render(<UsageBreakdownTable usageDetails={largeEntry} />);

      expect(screen.getByText('999')).toBeInTheDocument();
      expect(screen.getByText('99999')).toBeInTheDocument();
      expect(screen.getByText('9999.99')).toBeInTheDocument();
    });
  });
});
