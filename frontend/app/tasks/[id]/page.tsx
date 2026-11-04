'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, ArrowUpCircle, Lock, MessageSquare, Send, Trash2 } from 'lucide-react';
import { useTaskDetail, useTaskEscalations } from '@/hooks/useTasks';
import { useProjectDetail } from '@/hooks/useProjects';
import { commentApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { can } from '@/lib/permissions';
import { statusStyles, priorityStyles, getInitials, getAvatarColor } from '@/lib/styles';
import { queryKeys } from '@/lib/queryKeys';
import { ESCALATION_LEVELS } from '@/lib/sla';
import { SlaBadge } from '@/components/SlaBadge';
import { EscalateModal } from '@/components/EscalateModal';
import { ErrorState, SkeletonRows } from '@/components/ui/States';

const fmt = (value?: string | null) => (value ? new Date(value).toLocaleString() : '—');

function Person({ label, person }: { label: string; person?: { id: string; name: string } | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">{label}</p>
      {person ? (
        <div className="mt-2 flex items-center gap-2">
          <span
            className={`grid h-7 w-7 place-items-center rounded-full border text-xs font-bold ${getAvatarColor(person.id)}`}
          >
            {getInitials(person.name)}
          </span>
          <span className="text-sm font-medium text-fg">{person.name}</span>
        </div>
      ) : (
        <span className="mt-2 block text-sm italic text-fg-subtle">Unassigned</span>
      )}
    </div>
  );
}

export default function TaskDetailPage({ params }: { params: { id: string } }) {
  const taskId = params.id;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useTaskDetail(taskId);
  const { data: escalationData } = useTaskEscalations(taskId);
  const { data: projectData } = useProjectDetail(data?.task?.project?.id ?? '');

  const [content, setContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <SkeletonRows count={3} height="h-40" />
      </div>
    );
  }

  if (isError || !data?.task) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <ErrorState message={(error as Error)?.message || 'This ticket could not be found.'} onRetry={() => refetch()} />
      </div>
    );
  }

  const task = data.task;
  const role = projectData?.project?.currentUserRole;
  const ctx = { globalRole: user?.globalRole, projectRole: role, userId: user?.id };
  const isArchived = projectData?.project?.isArchived;
  const finished = task.status === 'DONE' || task.status === 'CLOSED';
  const canEscalate =
    !isArchived &&
    !finished &&
    (task.escalationLevel ?? 1) < 3 &&
    can(ctx, 'task:escalate', { assigneeId: task.assigneeId });
  const canComment = !isArchived && can(ctx, 'comment:create');
  const escalations = escalationData?.escalations ?? [];

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setIsSubmitting(true);

    try {
      await commentApi.create(taskId, content, isInternal);
      setContent('');
      setIsInternal(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
    } catch (err: any) {
      alert(err.message || 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      await commentApi.delete(commentId);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to delete comment');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href={`/projects/${task.project.id}/tasks`}
        className="inline-flex items-center gap-2 text-xs font-medium text-fg-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to ticket board
      </Link>

      <div className="card space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-fg-subtle">#{task.ticketNumber}</span>
              <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusStyles[task.status]?.badge}`}>
                {statusStyles[task.status]?.label}
              </span>
              <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${priorityStyles[task.priority]?.badge}`}>
                {task.priority}
              </span>
              {task.escalationLevel > 1 && (
                <span className="rounded-full border border-danger/25 bg-danger/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-danger">
                  {ESCALATION_LEVELS[task.escalationLevel] ?? `Level ${task.escalationLevel}`}
                </span>
              )}
              {task.category && <span className="pill">{task.category}</span>}
              <span className="rounded border border-line bg-surface-2 px-2 py-0.5 font-mono text-xs text-fg-muted">
                v{task.version}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-fg">{task.title}</h1>
          </div>

          {canEscalate && (
            <button onClick={() => setShowEscalate(true)} className="btn-danger">
              <ArrowUpCircle className="h-4 w-4" />
              Escalate
            </button>
          )}
        </div>

        {/* Description */}
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-fg-subtle">Description</h3>
          <p className="whitespace-pre-wrap rounded-xl border border-line bg-surface-2 p-4 text-sm leading-relaxed text-fg-muted">
            {task.description || 'No description provided for this ticket.'}
          </p>
        </div>

        {/* SLA */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wider text-fg-subtle">Service level</h3>
            <SlaBadge task={task} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
            {[
              ['Opened', fmt(task.createdAt)],
              ['First response due', fmt(task.slaResponseDueAt)],
              ['Resolve by', fmt(task.slaResolveDueAt)],
              ['Resolved', fmt(task.resolvedAt)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line bg-surface-2 p-3">
                <p className="text-fg-subtle">{label}</p>
                <p className="mt-1 font-medium text-fg">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-fg-subtle">
            First response: {task.firstResponseAt ? fmt(task.firstResponseAt) : 'waiting for the first public reply'}
            {task.reopenCount > 0 && ` · reopened ${task.reopenCount}×`}
          </p>
        </div>

        {/* People */}
        <div className="grid grid-cols-1 gap-4 border-y border-line py-4 sm:grid-cols-3">
          <Person label="Assignee" person={task.assignee} />
          <Person label="Requester" person={task.requester} />
          <Person label="Created by" person={task.createdBy} />
        </div>

        {/* Escalation history */}
        {escalations.length > 0 && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
              <ArrowUpCircle className="h-4 w-4 text-danger" />
              Escalation history ({escalations.length})
            </h3>
            <ol className="space-y-2">
              {escalations.map((e: any) => (
                <li key={e.id} className="rounded-xl border border-line bg-surface-2 p-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        e.type === 'SLA_BREACH'
                          ? 'border-danger/25 bg-danger/10 text-danger'
                          : 'border-line bg-surface text-fg-muted'
                      }`}
                    >
                      {e.type === 'SLA_BREACH' ? 'SLA breach' : 'Manual'}
                    </span>
                    <span className="font-medium text-fg-muted">{e.fromAssignee?.name ?? 'Unassigned'}</span>
                    <ArrowRight className="h-3 w-3 text-fg-subtle" />
                    <span className="font-medium text-fg">{e.escalatedTo?.name ?? 'Nobody available'}</span>
                    <span className="text-fg-subtle">
                      ({ESCALATION_LEVELS[e.fromLevel]} → {ESCALATION_LEVELS[e.toLevel]})
                    </span>
                  </div>
                  <p className="mt-1.5 text-fg-muted">{e.reason}</p>
                  <p className="mt-1 text-[11px] text-fg-subtle">
                    {fmt(e.createdAt)} · {e.escalatedBy ? `by ${e.escalatedBy.name}` : 'automatic (SLA worker)'}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Comments */}
        <div className="space-y-4 pt-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <MessageSquare className="h-4 w-4 text-accent" />
            Comments ({task.comments?.length || 0})
          </h3>

          <div className="space-y-3">
            {task.comments?.length === 0 && (
              <p className="py-6 text-center text-xs text-fg-subtle">No comments yet. Mention team members with @name!</p>
            )}
            {task.comments?.map((c: any) => {
              const canDelete = !isArchived && can(ctx, 'comment:delete', { authorId: c.userId });
              return (
                <div
                  key={c.id}
                  className={`space-y-1 rounded-xl border p-3.5 text-xs ${
                    c.isInternal ? 'border-warning/25 bg-warning/10' : 'border-line bg-surface-2'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-fg">
                      {c.user?.name}
                      {c.isInternal && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold text-warning">
                          <Lock className="h-2.5 w-2.5" />
                          Internal note
                        </span>
                      )}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        aria-label="Delete comment"
                        className="text-fg-subtle hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-fg-muted">{c.content}</p>
                </div>
              );
            })}
          </div>

          {canComment && (
            <form onSubmit={handleAddComment} className="space-y-2 pt-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={isInternal ? 'Write an internal note (staff only)...' : 'Write a reply... (e.g. @Alex please review)'}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="input"
                />
                <button type="submit" disabled={isSubmitting} className="btn-primary" aria-label="Send">
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-fg-muted">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="accent-[rgb(var(--accent))]"
                />
                <Lock className="h-3 w-3" />
                Internal note: visible to staff only, never to viewers. Doesn't count as a first response.
              </label>
            </form>
          )}
        </div>
      </div>

      {showEscalate && <EscalateModal task={task} onClose={() => setShowEscalate(false)} />}
    </div>
  );
}