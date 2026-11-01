'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTaskDetail } from '@/hooks/useTasks';
import { commentApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { can } from '@/lib/permissions';
import { statusStyles, priorityStyles, getInitials, getAvatarColor } from '@/lib/styles';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { ArrowLeft, MessageSquare, Send, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function TaskDetailPage({ params }: { params: { id: string } }) {
  const taskId = params.id;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useTaskDetail(taskId);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="h-10 w-32 bg-slate-800 rounded-xl animate-pulse" />
        <div className="glass-panel h-64 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (isError || !data?.task) {
    return (
      <div className="glass-panel p-8 rounded-2xl border border-danger/30 text-center space-y-3 max-w-md mx-auto">
        <AlertTriangle className="h-10 w-10 text-danger mx-auto" />
        <h3 className="text-base font-semibold text-slate-200">Task Not Found</h3>
        <button onClick={() => refetch()} className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-white">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  const task = data.task;

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setIsSubmitting(true);

    try {
      await commentApi.create(taskId, content);
      setContent('');
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
      refetch();
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link
        href={`/projects/${task.project.id}/tasks`}
        className="inline-flex items-center space-x-2 text-xs font-semibold text-fg-muted hover:text-fg transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Project Kanban</span>
      </Link>

      <div className="bg-surface p-6 rounded-2xl border border-line shadow-sm space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border ${statusStyles[task.status]?.badge}`}>
                {statusStyles[task.status]?.label}
              </span>
              <span className={`px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border ${priorityStyles[task.priority]?.badge}`}>
                {task.priority} Priority
              </span>
              <span className="text-xs font-mono text-fg-muted bg-surface-2 px-2 py-0.5 rounded border border-line">
                Version v{task.version}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-fg tracking-tight mt-3">{task.title}</h1>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-fg-subtle uppercase tracking-wider mb-2">Description</h3>
          <p className="text-sm text-fg-muted leading-relaxed bg-surface-2 p-4 rounded-xl border border-line whitespace-pre-wrap">
            {task.description || 'No description provided for this task.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs border-t border-b border-line py-4">
          <div>
            <p className="font-semibold text-fg-subtle uppercase tracking-wider">Assignee</p>
            {task.assignee ? (
              <div className="flex items-center space-x-2 mt-2">
                <div className={`h-7 w-7 rounded-full border flex items-center justify-center font-bold text-xs ${getAvatarColor(task.assignee.id)}`}>
                  {getInitials(task.assignee.name)}
                </div>
                <span className="font-medium text-fg">{task.assignee.name}</span>
              </div>
            ) : (
              <span className="text-fg-subtle italic mt-1 block">Unassigned</span>
            )}
          </div>

          <div>
            <p className="font-semibold text-fg-subtle uppercase tracking-wider">Created By</p>
            <div className="flex items-center space-x-2 mt-2">
              <div className={`h-7 w-7 rounded-full border flex items-center justify-center font-bold text-xs ${getAvatarColor(task.createdBy.id)}`}>
                {getInitials(task.createdBy.name)}
              </div>
              <span className="font-medium text-fg">{task.createdBy.name}</span>
            </div>
          </div>
        </div>

        {/* Task Comments Stream */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold text-fg flex items-center space-x-2">
            <MessageSquare className="h-4 w-4 text-accent" />
            <span>Task Comments ({task.comments?.length || 0})</span>
          </h3>

          <div className="space-y-3">
            {task.comments?.length === 0 && (
              <p className="text-xs text-fg-subtle text-center py-6">No comments added yet. Mention team members with @name!</p>
            )}
            {task.comments?.map((c: any) => (
              <div key={c.id} className="p-3.5 rounded-xl bg-surface-2 border border-line space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-fg">{c.user?.name}</span>
                  <button onClick={() => handleDeleteComment(c.id)} className="text-fg-subtle hover:text-danger">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-fg-muted whitespace-pre-wrap">{c.content}</p>
              </div>
            ))}
          </div>

          {/* Add Comment Form */}
          <form onSubmit={handleAddComment} className="flex items-center space-x-2 pt-3">
            <input
              type="text"
              placeholder="Write a comment... (e.g. @Alex please review)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 bg-surface-2 border border-line rounded-xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:bg-surface focus:border-accent/60"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
