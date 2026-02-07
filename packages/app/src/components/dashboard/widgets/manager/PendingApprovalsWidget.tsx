// Pending Approvals Widget
// Created: 2026-02-07
// Purpose: Display submissions awaiting manager approval

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Clock, CheckCircle, XCircle, ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';

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

      // Mock data
      setApprovals([
        {
          id: '1',
          formName: 'דו"ח שירות יומי',
          submitterName: 'יעל כהן',
          submittedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
          priority: 'high',
          formId: 'form_1',
        },
        {
          id: '2',
          formName: 'טופס בקשת חופשה',
          submitterName: 'דני לוי',
          submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          priority: 'normal',
          formId: 'form_2',
        },
        {
          id: '3',
          formName: 'דו"ח תקלה',
          submitterName: 'מיכל אברהם',
          submittedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
          priority: 'high',
          formId: 'form_3',
        },
      ]);

      setStats({
        pending: 3,
        approvedToday: 8,
        rejectedToday: 1,
      });
    } catch (err) {
      console.error('Failed to load pending approvals:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `לפני ${diffDays} ימים`;
    if (diffHours > 0) return `לפני ${diffHours} שעות`;
    if (diffMins > 0) return `לפני ${diffMins} דקות`;
    return 'עכשיו';
  }

  function getPriorityBadge(priority: PendingApproval['priority']) {
    switch (priority) {
      case 'high':
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
            דחוף
          </span>
        );
      case 'low':
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 rounded">
            נמוך
          </span>
        );
      default:
        return null;
    }
  }

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="h-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
              <div className="h-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
              <div className="h-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-zinc-200 dark:bg-zinc-700 rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardCheck className="w-5 h-5 text-primary" />
          אישורים ממתינים
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-border">
            <div className="text-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</span>
              </div>
              <div className="text-[10px] text-muted-foreground">ממתין</div>
            </div>
            <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-xl font-bold text-green-600 dark:text-green-400">{stats.approvedToday}</span>
              </div>
              <div className="text-[10px] text-muted-foreground">אושר היום</div>
            </div>
            <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-xl font-bold text-red-600 dark:text-red-400">{stats.rejectedToday}</span>
              </div>
              <div className="text-[10px] text-muted-foreground">נדחה היום</div>
            </div>
          </div>
        )}

        {/* Pending Items */}
        {approvals.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground text-sm">אין אישורים ממתינים</p>
          </div>
        ) : (
          <div className="space-y-2">
            {approvals.map((approval) => (
              <button
                key={approval.id}
                onClick={() => navigate(`/responses/${approval.formId}?submission=${approval.id}`)}
                className="w-full flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-lg transition-colors text-right"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{approval.formName}</span>
                    {getPriorityBadge(approval.priority)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {approval.submitterName} • {formatTimeAgo(approval.submittedAt)}
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
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
            צפה בכל האישורים הממתינים →
          </button>
        )}
      </CardContent>
    </Card>
  );
}
