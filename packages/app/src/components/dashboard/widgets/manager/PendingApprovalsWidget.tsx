// Pending Approvals Widget
// Created: 2026-02-07
// Purpose: Display submissions awaiting manager approval

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { useTranslation } from '../../../../i18n';

interface PendingApproval {
  id: string;
  formName: string;
  submitterName: string;
  submittedAt: Date;
  priority: 'high' | 'normal' | 'low';
  formId: string;
}

interface ApprovalStats {
  pending: number;
  approvedToday: number;
  rejectedToday: number;
}

export function PendingApprovalsWidget() {
  const navigate = useNavigate();
  const t = useTranslation();
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  async function loadPendingApprovals() {
    try {
      setLoading(true);
      // TODO: Replace with actual API call to /api/v1/submissions?status=pending
      const response = await fetch('/api/v1/submissions?status=pending');
      if (response.ok) {
        const data = await response.json();
        setApprovals(data.approvals || []);
        setStats(data.stats || null);
      } else {
        setApprovals([]);
        setStats(null);
      }
    } catch (err) {
      console.error('Failed to load pending approvals:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return t['dashboard.time.ago'].replace('{time}', `${diffDays} ${t['dashboard.time.days']}`);
    if (diffHours > 0) return t['dashboard.time.ago'].replace('{time}', `${diffHours} ${t['dashboard.time.hours']}`);
    if (diffMins > 0) return t['dashboard.time.ago'].replace('{time}', `${diffMins} ${t['dashboard.time.mins']}`);
    return t['dashboard.time.now'];
  }

  function getPriorityBadge(priority: PendingApproval['priority']) {
    switch (priority) {
      case 'high':
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
            {t['dashboard.widgets.pendingApprovals.urgent']}
          </span>
        );
      case 'low':
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 rounded">
            {t['dashboard.widgets.pendingApprovals.low']}
          </span>
        );
      default:
        return null;
    }
  }

  if (loading) {
    return (
      <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-gray-200 dark:bg-gray-700 rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <MaterialIcon name="task_alt" size="md" className="text-blue-600 dark:text-blue-400" />
          </span>
          {t['dashboard.widgets.pendingApprovals.title']}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <MaterialIcon name="schedule" size="sm" className="text-amber-500" />
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats.pending}</span>
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">{t['dashboard.status.pending']}</div>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <MaterialIcon name="check_circle" size="sm" className="text-green-500" />
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats.approvedToday}</span>
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">{t['dashboard.widgets.pendingApprovals.approvedToday']}</div>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <MaterialIcon name="cancel" size="sm" className="text-red-500" />
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats.rejectedToday}</span>
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">{t['dashboard.widgets.pendingApprovals.rejectedToday']}</div>
            </div>
          </div>
        )}

        {/* Pending Items */}
        {approvals.length === 0 ? (
          <div className="text-center py-8">
            <MaterialIcon name="check_circle" size="xl" className="text-green-500 mx-auto mb-3 opacity-50" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t['dashboard.widgets.pendingApprovals.empty']}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {approvals.map((approval) => (
              <button
                key={approval.id}
                onClick={() => navigate(`/responses/${approval.formId}?submission=${approval.id}`)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors text-right"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{approval.formName}</span>
                    {getPriorityBadge(approval.priority)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {approval.submitterName} • {formatTimeAgo(approval.submittedAt)}
                  </div>
                </div>
                <MaterialIcon name="chevron_left" size="sm" className="text-gray-400 dark:text-gray-500" />
              </button>
            ))}
          </div>
        )}

        {/* View All Link */}
        {approvals.length > 0 && (
          <button
            onClick={() => navigate('/responses?status=pending')}
            className="w-full mt-4 py-2 text-sm text-primary hover:underline"
          >
            {t['dashboard.widgets.pendingApprovals.viewAll']} →
          </button>
        )}
      </CardContent>
    </Card>
  );
}
