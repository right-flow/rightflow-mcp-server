import { useState, useRef } from 'react';
import {
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  FileText,
  Calendar,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import type { FormRecord } from '../../services/forms/forms.service';
import { motion, AnimatePresence } from 'framer-motion';

interface FormCardProps {
  form: FormRecord;
  onDelete: () => void;
  onEdit: () => void;
  onViewResponses: () => void;
  canDelete?: boolean;
}

export function FormCard({ form, onDelete, onEdit, onViewResponses, canDelete = true }: FormCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const formattedDate = new Date(form.created_at).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const statusBadge = {
    draft: { label: 'טיוטה', color: 'bg-muted text-muted-foreground', icon: FileText },
    published: { label: 'מפורסם', color: 'bg-green-500/10 text-green-600 border border-green-500/20', icon: CheckCircle2 },
    archived: { label: 'בארכיון', color: 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20', icon: FileText },
  };

  const badge = statusBadge[form.status] || statusBadge.draft;
  const publicUrl = form.status === 'published' ? `${window.location.origin}/f/${form.slug}` : null;

  function handleCopyLink() {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleOpenPublicForm() {
    if (publicUrl) {
      window.open(publicUrl, '_blank');
    }
  }

  function handleMenuToggle() {
    setIsMenuOpen(!isMenuOpen);
  }

  return (
    <div className="glass-card flex flex-col h-full group">
      {/* Card Header Illustration/Icon Area */}
      <div className="h-24 bg-gradient-to-br from-primary/5 to-accent/5 rounded-t-2xl flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,transparent,black)] dark:bg-grid-slate-700/25" />
        <FileText className="w-10 h-10 text-primary/40 group-hover:scale-110 transition-transform duration-500" />

        <div className="absolute top-4 right-4">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badge.color}`}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className="font-bold text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors">
            {form.title}
          </h3>
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={handleMenuToggle}
              className="text-muted-foreground hover:text-foreground p-1 transition-colors rounded-lg hover:bg-muted"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-[100]" onClick={() => setIsMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute top-full left-0 mt-2 w-48 bg-popover backdrop-blur-xl rounded-xl shadow-2xl border border-border z-[101] py-2 outline-none"
                  >
                    <button
                      onClick={() => { setIsMenuOpen(false); onEdit(); }}
                      className="w-full flex items-center justify-end gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      ערוך <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setIsMenuOpen(false); onViewResponses(); }}
                      className="w-full flex items-center justify-end gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      תגובות <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    {form.status === 'published' && (
                      <button
                        onClick={() => { setIsMenuOpen(false); handleCopyLink(); }}
                        className="w-full flex items-center justify-end gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
                      >
                        העתק קישור <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canDelete && (
                      <>
                        <div className="h-px bg-border my-1" />
                        <button
                          onClick={() => { setIsMenuOpen(false); onDelete(); }}
                          className="w-full flex items-center justify-end gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          מחק <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 h-8 leading-relaxed">
          {form.description || 'אין תיאור לטופס זה'}
        </p>

        {/* Quick Actions - Show for published forms */}
        {form.status === 'published' && publicUrl && (
          <div className="flex gap-2 mb-3">
            <button
              onClick={handleCopyLink}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
              title="העתק קישור"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  הועתק!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  העתק קישור
                </>
              )}
            </button>
            <button
              onClick={handleOpenPublicForm}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
              title="פתח טופס"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {formattedDate}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <MessageSquare className="w-3 h-3" />
              {form.fields.length} שדות
            </div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <FileText className="w-3 h-3" />
              {(() => {
                const pages = new Set(form.fields.map((f: any) => f.pageNumber || 1));
                return `${pages.size} עמודים`;
              })()}
            </div>
          </div>

          <button
            onClick={onEdit}
            className="w-8 h-8 rounded-full bg-primary/5 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all group/btn"
            title="עריכה"
          >
            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
