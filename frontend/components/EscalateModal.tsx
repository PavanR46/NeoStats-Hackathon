'use client';

import React, { useEffect, useState } from 'react';
import { ArrowUpCircle, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, taskApi } from '@/lib/api';
import { ESCALATION_LEVELS } from '@/lib/sla';
import { useToast } from '@/components/ui/Toast';

export function EscalateModal({ task, onClose }: { task: any; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const from = task.escalationLevel ?? 1;
  const to = from + 1;
  const valid = reason.trim().length >= 5;

  // Escape closes the dialog
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['task'] });
    queryClient.invalidateQueries({ queryKey: ['task-escalations'] });
    queryClient.invalidateQueries({ queryKey: ['escalations'] });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    setError(null);

    try {
      await taskApi.escalate(task.id, { version: task.version, reason: reason.trim() });
      toast.success(`Ticket #${task.ticketNumber} escalated to ${ESCALATION_LEVELS[to] ?? `level ${to}`}.`);
      refresh();
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        // Someone changed the ticket since this page loaded: reload it and let the user decide again
        toast.error(`Ticket #${task.ticketNumber} was just changed by someone else. It has been reloaded, please review it.`);
        refresh();
        onClose();
      } else {
        setError(err.message || 'Failed to escalate the ticket.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="escalate-title"
    >
      <form onSubmit={submit} className="card w-full max-w-md space-y-4 p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center gap-3">
            <ArrowUpCircle className="h-6 w-6 shrink-0 text-danger" />
            <div>
              <h3 id="escalate-title" className="text-base font-semibold text-fg">
                Escalate ticket #{task.ticketNumber}
              </h3>
              <p className="text-xs text-fg-muted">
                {ESCALATION_LEVELS[from] ?? `Level ${from}`} → {ESCALATION_LEVELS[to] ?? `Level ${to}`}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-fg-subtle hover:text-fg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-fg-muted">
          The ticket is reassigned to the next level and gets a shorter deadline. Everyone involved is notified, and
          the reason is kept in the ticket history.
        </p>

        {error && (
          <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="escalate-reason" className="mb-1 block text-xs font-medium text-fg-muted">
            Why does this need to be escalated? *
          </label>
          <textarea
            id="escalate-reason"
            autoFocus
            rows={4}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Customer is blocked and I need a lead's decision"
            className="input resize-none"
          />
          <p className="mt-1 text-right text-[11px] text-fg-subtle">{reason.trim().length}/500 (minimum 5)</p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={!valid || submitting} className="btn-primary">
            {submitting ? 'Escalating...' : 'Escalate'}
          </button>
        </div>
      </form>
    </div>
  );
}