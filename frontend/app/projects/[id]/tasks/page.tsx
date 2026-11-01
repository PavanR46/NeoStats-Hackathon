'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useProjectDetail } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useMembers } from '@/hooks/useMembers';
import { taskApi, commentApi, ApiError } from '@/lib/api';
import { can } from '@/lib/permissions';
import { statusStyles, priorityStyles, getInitials, getAvatarColor } from '@/lib/styles';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  Plus,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  X,
  Send,
  Trash2,
  Lock,
} from 'lucide-react';

const COLUMNS = [
  { id: 'TODO', title: 'To Do', style: statusStyles.TODO },
  { id: 'IN_PROGRESS', title: 'In Progress', style: statusStyles.IN_PROGRESS },
  { id: 'IN_REVIEW', title: 'In Review', style: statusStyles.IN_REVIEW },
  { id: 'DONE', title: 'Done', style: statusStyles.DONE },
];

export default function TasksKanbanPage({ params }: { params: { id: string } }) {
  const projectId = params.id;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: projectData } = useProjectDetail(projectId);
  const { data: tasksData, isLoading, isError, refetch } = useTasks(projectId, { limit: 100 });
  const { data: membersData } = useMembers(projectId);

  const currentUserRole = projectData?.project?.currentUserRole;
  const isArchived = projectData?.project?.isArchived;

  const canCreateTask = !isArchived && can({ globalRole: user?.globalRole, projectRole: currentUserRole }, 'task:create');

  // Create Task Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [status, setStatus] = useState('TODO');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // 409 Conflict Modal State
  const [conflictState, setConflictState] = useState<{
    isOpen: boolean;
    taskId: string;
    pendingStatus: string;
    staleVersion: number;
    latestTask: any;
  }>({
    isOpen: false,
    taskId: '',
    pendingStatus: '',
    staleVersion: 1,
    latestTask: null,
  });

  // Comments Drawer State
  const [selectedTaskForComments, setSelectedTaskForComments] = useState<any | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const tasks = tasksData?.data || [];
  const members = membersData?.members || [];

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setIsCreating(true);

    try {
      await taskApi.create(projectId, {
        title,
        description,
        priority,
        status,
        assigneeId: assigneeId || null,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(projectId) });
      setIsCreateOpen(false);
      setTitle('');
      setDescription('');
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create task');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusChange = async (task: any, newStatus: string) => {
    if (task.status === newStatus || isArchived) return;

    try {
      await taskApi.updateStatus(task.id, {
        version: task.version,
        status: newStatus,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(projectId) });
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409 && err.latestTask) {
        // Trigger 409 Conflict Modal
        setConflictState({
          isOpen: true,
          taskId: task.id,
          pendingStatus: newStatus,
          staleVersion: task.version,
          latestTask: err.latestTask,
        });
      } else {
        alert(err.message || 'Failed to update task status');
      }
    }
  };

  const handleResolveConflictUseLatest = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(projectId) });
    setConflictState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleResolveConflictReapply = async () => {
    try {
      await taskApi.updateStatus(conflictState.taskId, {
        version: conflictState.latestTask.version,
        status: conflictState.pendingStatus,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(projectId) });
      setConflictState((prev) => ({ ...prev, isOpen: false }));
    } catch (err: any) {
      alert(err.message || 'Re-applying failed. Reloading latest task state.');
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(projectId) });
      setConflictState((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !selectedTaskForComments) return;
    setIsSubmittingComment(true);

    try {
      await commentApi.create(selectedTaskForComments.id, commentContent);
      setCommentContent('');
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(projectId) });
      // Fetch latest task comments
      const updated = await taskApi.getById(selectedTaskForComments.id);
      setSelectedTaskForComments(updated.task);
    } catch (err: any) {
      alert(err.message || 'Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      await commentApi.delete(commentId);
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(projectId) });
      const updated = await taskApi.getById(selectedTaskForComments.id);
      setSelectedTaskForComments(updated.task);
    } catch (err: any) {
      alert(err.message || 'Failed to delete comment');
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-fg tracking-tight">Interactive Kanban Board</h2>
          <p className="text-xs text-fg-muted mt-0.5">
            Real-time status updates with Optimistic Concurrency Locking.
          </p>
        </div>

        {canCreateTask && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>New Task</span>
          </button>
        )}
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface p-4 rounded-2xl border border-line animate-pulse h-96" />
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="bg-surface p-8 rounded-2xl border border-danger/25 text-center space-y-3 max-w-md mx-auto shadow-sm">
          <AlertTriangle className="h-10 w-10 text-danger mx-auto" />
          <h3 className="text-base font-semibold text-fg">Failed to load tasks</h3>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-surface-2 text-xs font-medium text-fg hover:bg-line"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Kanban Board Columns */}
      {!isLoading && !isError && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const columnTasks = tasks.filter((t: any) => t.status === col.id);

            return (
              <div key={col.id} className="bg-surface p-4 rounded-2xl border border-line shadow-sm flex flex-col min-h-[500px]">
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-line">
                  <div className="flex items-center space-x-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${col.style.dot}`} />
                    <h3 className="text-sm font-bold text-fg">{col.title}</h3>
                  </div>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-surface-2 text-fg-muted border border-line">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 space-y-3">
                  {columnTasks.length === 0 && (
                    <div className="text-center py-8 text-xs text-fg-subtle border border-dashed border-line rounded-xl">
                      No tasks in {col.title}
                    </div>
                  )}

                  {columnTasks.map((task: any) => {
                    const canEdit =
                      !isArchived &&
                      can(
                        { globalRole: user?.globalRole, projectRole: currentUserRole, userId: user?.id },
                        'task:update',
                        { assigneeId: task.assigneeId }
                      );

                    return (
                      <div
                        key={task.id}
                        className="bg-surface p-4 rounded-xl border border-line/90 shadow-xs space-y-3 group hover:border-accent/40 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/tasks/${task.id}`}
                            className="text-sm font-semibold text-fg group-hover:text-accent transition-colors line-clamp-2"
                          >
                            {task.title}
                          </Link>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border shrink-0 ${
                              priorityStyles[task.priority]?.badge || priorityStyles.MEDIUM.badge
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        {task.description && (
                          <p className="text-xs text-fg-muted line-clamp-2">{task.description}</p>
                        )}

                        <div className="pt-2 border-t border-line flex items-center justify-between text-xs">
                          {/* Assignee Avatar */}
                          {task.assignee ? (
                            <div className="flex items-center space-x-1.5" title={`Assigned to ${task.assignee.name}`}>
                              <div
                                className={`h-6 w-6 rounded-full border flex items-center justify-center font-bold text-[10px] ${getAvatarColor(
                                  task.assignee.id
                                )}`}
                              >
                                {getInitials(task.assignee.name)}
                              </div>
                              <span className="text-[11px] text-fg-muted truncate max-w-[80px]">
                                {task.assignee.name.split(' ')[0]}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-fg-subtle italic">Unassigned</span>
                          )}

                          <div className="flex items-center space-x-2">
                            {/* Version Tag */}
                            <span className="text-[10px] font-mono text-fg-muted bg-surface-2 px-1.5 py-0.5 rounded border border-line">
                              v{task.version}
                            </span>

                            {/* Comment Count */}
                            <button
                              onClick={() => setSelectedTaskForComments(task)}
                              className="flex items-center space-x-1 text-fg-muted hover:text-fg transition-colors"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span className="text-[11px]">{task._count?.comments || 0}</span>
                            </button>

                            {/* Quick Status Select */}
                            {canEdit ? (
                              <select
                                value={task.status}
                                onChange={(e) => handleStatusChange(task, e.target.value)}
                                className="bg-surface-2 text-fg text-[11px] font-medium border border-line rounded px-1.5 py-0.5 focus:outline-none"
                              >
                                {COLUMNS.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    Move to {c.title}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span title="Permission restricted">
                                <Lock className="h-3.5 w-3.5 text-fg-subtle" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 409 CONFLICT RESOLUTION MODAL */}
      {conflictState.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-surface p-6 rounded-2xl border border-warning/25 shadow-2xl space-y-5">
            <div className="flex items-center space-x-3 border-b border-line pb-3">
              <AlertTriangle className="h-6 w-6 text-warning shrink-0" />
              <div>
                <h3 className="text-base font-bold text-fg">409 Conflict: Task Modified By Another User</h3>
                <p className="text-xs text-fg-muted">
                  Someone saved edits while you were reviewing. Review changes below to resolve.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-surface-2 border border-line space-y-2">
                <p className="font-bold text-fg-muted uppercase tracking-wider">Your Pending Edit</p>
                <p className="text-fg-muted">
                  Target Status: <span className="font-semibold text-warning">{conflictState.pendingStatus}</span>
                </p>
                <p className="text-fg-subtle">Stale Version: v{conflictState.staleVersion}</p>
              </div>

              <div className="p-4 rounded-xl bg-accent/60 border border-accent/25 space-y-2">
                <p className="font-bold text-accent uppercase tracking-wider">Latest Server Record</p>
                <p className="text-fg-muted">
                  Current Title: <span className="font-semibold text-fg">{conflictState.latestTask?.title}</span>
                </p>
                <p className="text-fg-muted">
                  Current Status: <span className="font-semibold text-accent">{conflictState.latestTask?.status}</span>
                </p>
                <p className="text-fg-muted">Updated Version: v{conflictState.latestTask?.version}</p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={handleResolveConflictUseLatest}
                className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-line text-xs font-medium text-fg-muted transition-colors"
              >
                Discard My Edit & Reload Latest
              </button>
              <button
                onClick={handleResolveConflictReapply}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-brand-600 hover:from-amber-700 hover:to-brand-700 text-xs font-semibold text-white transition-all shadow-md"
              >
                Re-apply Edit onto Version {conflictState.latestTask?.version}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface p-6 rounded-2xl border border-line shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-lg font-bold text-fg">Create New Task</h3>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 text-fg-subtle hover:text-fg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-danger/10 border border-danger/25 text-danger text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement JWT Refresh Strategy"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-surface-2 border border-line rounded-xl px-3.5 py-2.5 text-sm text-fg focus:outline-none focus:bg-surface focus:border-accent/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Task details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-surface-2 border border-line rounded-xl px-3.5 py-2.5 text-sm text-fg focus:outline-none focus:bg-surface focus:border-accent/60 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs text-fg focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">
                    Initial Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs text-fg focus:outline-none"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">
                  Assignee
                </label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2.5 text-xs text-fg focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {members.map((m: any) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-2 text-xs text-fg-muted hover:bg-line"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-xs font-semibold text-white shadow-md"
                >
                  {isCreating ? 'Creating...' : 'Create Task (v1)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMMENTS DRAWER */}
      {selectedTaskForComments && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-surface border-l border-line h-full p-6 flex flex-col justify-between space-y-4 shadow-xl">
            <div>
              <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-fg line-clamp-1">{selectedTaskForComments.title}</h3>
                  <p className="text-xs text-fg-muted">Comments & Collaboration</p>
                </div>
                <button onClick={() => setSelectedTaskForComments(null)} className="p-1 text-fg-subtle hover:text-fg-muted">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Comments Stream */}
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {selectedTaskForComments.comments?.length === 0 && (
                  <p className="text-xs text-fg-subtle text-center py-6">No comments yet. Mention team members with @name!</p>
                )}
                {selectedTaskForComments.comments?.map((c: any) => {
                  const canDelete =
                    !isArchived &&
                    can(
                      { globalRole: user?.globalRole, projectRole: currentUserRole, userId: user?.id },
                      'comment:delete',
                      { authorId: c.userId }
                    );

                  return (
                    <div key={c.id} className="p-3 rounded-xl bg-surface-2 border border-line space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-fg">{c.user?.name}</span>
                        {canDelete && (
                          <button onClick={() => handleDeleteComment(c.id)} className="text-fg-subtle hover:text-danger">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-fg-muted whitespace-pre-wrap">{c.content}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Comment Post Form */}
            {!isArchived && (
              <form onSubmit={handleAddComment} className="flex items-center space-x-2 pt-3 border-t border-line">
                <input
                  type="text"
                  placeholder="Write a comment... (e.g. @Alex)"
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  className="flex-1 bg-surface-2 border border-line rounded-xl px-3.5 py-2.5 text-xs text-fg focus:outline-none focus:bg-surface focus:border-accent/60"
                />
                <button
                  type="submit"
                  disabled={isSubmittingComment}
                  className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
