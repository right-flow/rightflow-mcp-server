import { useState } from 'react';
import {
  MoreVertical,
  Edit2,
  Trash2,
  FileText,
  Calendar,
  MessageSquare,
  ExternalLink,
  CheckCircle2,
  MessageCircle,
} from 'lucide-react';
import type { FormRecord } from '../../services/forms/forms.service';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@clerk/clerk-react';
import { useTranslation, useDirection } from '../../i18n';

interface FormCardProps {
  form: FormRecord;
  onDelete: () => void;
  onEdit: () => void;
  onViewResponses: () => void;
  onSendWhatsApp?: () => void;
}

export function FormCard({ form, onDelete, onEdit, onViewResponses, onSendWhatsApp }: FormCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { getToken } = useAuth();
  const t = useTranslation();
  const direction = useDirection();

  const formattedDate = new Date(form.updated_at || form.created_at).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const statusBadge = {
    draft: { label: t.draft, className: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
    published: { label: t.published, className: 'bg-green-50 text-green-700 border-green-200' },
    archived: { label: t.archived, className: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
  };

  const badge = statusBadge[form.status] || statusBadge.draft;
  const publicUrl = form.status === 'published' ? `${window.location.origin}/f/${form.slug}` : null;

  async function handleDelete() {
    if (!confirm(t.deleteFormConfirm)) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/v1/forms/${form.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) onDelete();
    } catch (err) {
      console.error(err);
    }
  }

  function handleCopy() {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="premium-card flex flex-col h-full group p-0 overflow-hidden">
      {/* Visual Header */}
      <div className="h-32 bg-zinc-50 dark:bg-zinc-950/40 relative flex items-center justify-center border-b border-border">
        <div className="absolute inset-0 opacity-10 filter grayscale brightness-125" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
        <FileText className="w-10 h-10 text-zinc-300 group-hover:text-primary/40 transition-colors" />

        <div className={`absolute top-4 ${direction === 'rtl' ? 'right-4' : 'left-4'}`}>
          <span className={`status-badge ${badge.className}`}>
            {badge.label}
          </span>
        </div>

        <div className={`absolute top-3 ${direction === 'rtl' ? 'left-3' : 'right-3'}`}>
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800/10 dark:hover:bg-white/10 transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
            <AnimatePresence>
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`absolute top-full ${direction === 'rtl' ? 'left-0' : 'right-0'} mt-1 w-44 bg-white dark:bg-zinc-800 border border-border rounded-lg shadow-xl z-50 py-1`}
                  >
                    <button onClick={() => { setIsMenuOpen(false); onEdit(); }} className="w-full flex items-center justify-between px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-sm font-medium">
                      {t.edit} <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setIsMenuOpen(false); onViewResponses(); }} className="w-full flex items-center justify-between px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-sm font-medium">
                      {t.responses} <MessageSquare className="w-4 h-4" />
                    </button>
                    <div className="h-px bg-border my-1" />
                    <button onClick={() => { setIsMenuOpen(false); handleDelete(); }} className="w-full flex items-center justify-between px-4 py-2 hover:bg-red-50 dark:hover:bg-red-950/50 text-red-600 text-sm font-medium">
                      {t.delete} <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="font-bold text-lg text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-colors cursor-pointer" onClick={onEdit}>
          {form.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 h-10 mb-6">
          {form.description || t.noDescription}
        </p>

        <div className="mt-auto space-y-3">
          {/* Stats Row */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{t.fieldsCount.replace('{count}', (form.fields?.length || 0).toString())}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <FileText className="w-3.5 h-3.5" />
              <span>{t.onePage}</span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="flex items-center justify-center w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              title={t.edit}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              title={t.copyLink}
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <ExternalLink className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onSendWhatsApp}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors bg-green-500/10 text-green-600 hover:bg-green-500/20"
              title={t.sendWhatsApp}
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onViewResponses}
              className="flex items-center justify-center gap-1.5 px-3 h-8 bg-blue-500/10 text-blue-600 rounded-lg hover:bg-blue-500/20 transition-colors text-xs font-medium ms-auto"
              title={t.viewResponses}
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
