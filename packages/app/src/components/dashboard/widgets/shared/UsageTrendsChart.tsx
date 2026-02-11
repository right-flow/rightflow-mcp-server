// Usage Trends Chart Widget
// Created: 2026-02-08
// Updated: 2026-02-08 - Added i18n support
// Purpose: Display monthly usage trends with SVG line chart (from Dashboard1.html)

import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { useTranslation } from '../../../../i18n';

interface UsageTrendsChartProps {
  className?: string;
}

export function UsageTrendsChart({ className }: UsageTrendsChartProps) {
  const t = useTranslation();

  const months = [
    t['dashboard.months.january'],
    t['dashboard.months.february'],
    t['dashboard.months.march'],
    t['dashboard.months.april'],
    t['dashboard.months.may'],
    t['dashboard.months.june'],
  ];

  return (
    <div className={`bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 ${className || ''}`}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {t['dashboard.usageTrends.title']}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t['dashboard.usageTrends.dateRange']}</p>
        </div>
        <div className="flex gap-2">
          <button
            disabled
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-400 dark:text-gray-500 flex items-center gap-2 cursor-not-allowed opacity-60"
            title="Coming soon"
          >
            <MaterialIcon name="download" size="sm" />
            {t['dashboard.usageTrends.exportReport']}
          </button>
        </div>
      </div>
      <div>
        <div className="relative h-64 w-full">
          <svg
            role="img"
            aria-label={t['dashboard.usageTrends.title']}
            className="w-full h-full"
            preserveAspectRatio="none"
            viewBox="0 0 1000 200"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="chartGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#ff6200" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#ff6200" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            <line stroke="#e5e7eb" className="dark:stroke-gray-700" strokeWidth="1" x1="0" x2="1000" y1="50" y2="50" />
            <line stroke="#e5e7eb" className="dark:stroke-gray-700" strokeWidth="1" x1="0" x2="1000" y1="100" y2="100" />
            <line stroke="#e5e7eb" className="dark:stroke-gray-700" strokeWidth="1" x1="0" x2="1000" y1="150" y2="150" />
            {/* Chart area fill */}
            <path
              d="M1000,180 L1000,100 C850,80 700,120 550,40 C400,20 250,150 0,60 L0,180 Z"
              fill="url(#chartGradient)"
            />
            {/* Chart line */}
            <path
              d="M1000,100 C850,80 700,120 550,40 C400,20 250,150 0,60"
              fill="none"
              stroke="#ff6200"
              strokeLinecap="round"
              strokeWidth="4"
            />
          </svg>
          {/* Month labels */}
          <div className="flex justify-between mt-4 text-xs font-bold text-gray-500 dark:text-gray-400">
            {months.map((month) => (
              <span key={month}>{month}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
