// UsageBreakdownTable Component
// Created: 2026-02-05
// Purpose: Detailed usage breakdown table with sorting and filtering

import React, { useState, useMemo } from 'react';
import { UsageDetails, UsageEntry } from '../../../api/types';

interface UsageBreakdownTableProps {
  usageDetails: UsageDetails | null;
  loading?: boolean;
  className?: string;
}

type SortField = 'date' | 'forms' | 'submissions' | 'storage';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

/**
 * Usage breakdown table component
 * Displays detailed usage data by day with sorting
 */
export const UsageBreakdownTable: React.FC<UsageBreakdownTableProps> = ({
  usageDetails,
  loading = false,
  className = '',
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'date', direction: 'desc' });
  const [filterDays, setFilterDays] = useState<number>(30); // 7, 30, 90 days

  // Loading skeleton
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
        <div className="animate-pulse p-6">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!usageDetails || !usageDetails.dailyBreakdown || usageDetails.dailyBreakdown.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Usage Breakdown</h2>
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No usage data available</p>
        </div>
      </div>
    );
  }

  // Filter data by date range
  const filteredData = useMemo(() => {
    if (!usageDetails?.dailyBreakdown) return [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - filterDays);

    return usageDetails.dailyBreakdown.filter((entry) => {
      const entryDate = new Date(entry.date);
      return entryDate >= cutoffDate;
    });
  }, [usageDetails?.dailyBreakdown, filterDays]);

  // Sort data
  const sortedData = useMemo(() => {
    const sorted = [...filteredData];

    sorted.sort((a, b) => {
      let aValue: number | Date;
      let bValue: number | Date;

      switch (sortConfig.field) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'forms':
          aValue = a.formsCreated;
          bValue = b.formsCreated;
          break;
        case 'submissions':
          aValue = a.submissions;
          bValue = b.submissions;
          break;
        case 'storage':
          aValue = a.storageUsedMB;
          bValue = b.storageUsedMB;
          break;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [filteredData, sortConfig]);

  // Toggle sort
  const handleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Sort indicator component
  const SortIndicator: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortConfig.field !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    return sortConfig.direction === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Calculate totals
  const totals = useMemo(() => {
    return sortedData.reduce(
      (acc, entry) => ({
        formsCreated: acc.formsCreated + entry.formsCreated,
        submissions: acc.submissions + entry.submissions,
        storageUsedMB: acc.storageUsedMB + entry.storageUsedMB,
      }),
      { formsCreated: 0, submissions: 0, storageUsedMB: 0 }
    );
  }, [sortedData]);

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Usage Breakdown</h2>

          {/* Date range filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show:</span>
            <button
              onClick={() => setFilterDays(7)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filterDays === 7
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              7 days
            </button>
            <button
              onClick={() => setFilterDays(30)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filterDays === 30
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              30 days
            </button>
            <button
              onClick={() => setFilterDays(90)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filterDays === 90
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              90 days
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center gap-2">
                  <span>Date</span>
                  <SortIndicator field="date" />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('forms')}
              >
                <div className="flex items-center gap-2">
                  <span>Forms Created</span>
                  <SortIndicator field="forms" />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('submissions')}
              >
                <div className="flex items-center gap-2">
                  <span>Submissions</span>
                  <SortIndicator field="submissions" />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('storage')}
              >
                <div className="flex items-center gap-2">
                  <span>Storage (MB)</span>
                  <SortIndicator field="storage" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((entry, index) => (
              <tr key={entry.date} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatDate(entry.date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {entry.formsCreated}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {entry.submissions}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {entry.storageUsedMB.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100">
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                Total ({sortedData.length} days)
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                {totals.formsCreated}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                {totals.submissions}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                {totals.storageUsedMB.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default UsageBreakdownTable;
