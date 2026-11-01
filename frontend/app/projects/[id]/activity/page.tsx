'use client';

import React from 'react';
import { useProjectActivity } from '@/hooks/useActivity';
import { getInitials, getAvatarColor } from '@/lib/styles';
import {
  Activity,
  AlertTriangle,
  RefreshCw,
  Plus,
  CheckCircle2,
  Edit3,
  Trash2,
  UserPlus,
  UserMinus,
  Shield,
  MessageSquare,
  FolderPlus,
  Archive,
} from 'lucide-react';

function getActionMeta(act: any) {
  const metadata = act.metadata || {};
  const action = act.action;

  switch (action) {
    case 'TASK_CREATE':
      return {
        label: `created task "${metadata.title || 'Untitled'}"`,
        subtext: metadata.status ? `Status: ${metadata.status}` : undefined,
        icon: Plus,
        badgeBg: 'bg-accent/10 text-accent border-accent/25',
      };
    case 'TASK_UPDATE':
      if (metadata.status) {
        return {
          label: `updated task status to ${metadata.status.replace(/_/g, ' ')}`,
          subtext: metadata.title || metadata.taskTitle ? `Task: "${metadata.title || metadata.taskTitle}"` : undefined,
          icon: CheckCircle2,
          badgeBg: 'bg-info/10 text-info border-info/25',
        };
      }
      return {
        label: `updated task "${metadata.title || metadata.taskTitle || ''}"`,
        icon: Edit3,
        badgeBg: 'bg-info/10 text-info border-info/25',
      };
    case 'TASK_DELETE':
      return {
        label: `deleted task "${metadata.title || ''}"`,
        icon: Trash2,
        badgeBg: 'bg-danger/10 text-danger border-danger/25',
      };
    case 'MEMBER_ADD':
      return {
        label: `added a new project member`,
        subtext: metadata.role ? `Assigned Role: ${metadata.role}` : undefined,
        icon: UserPlus,
        badgeBg: 'bg-plum/10 text-plum border-plum/25',
      };
    case 'MEMBER_REMOVE':
      return {
        label: `removed a member from the project`,
        icon: UserMinus,
        badgeBg: 'bg-danger/10 text-danger border-danger/25',
      };
    case 'MEMBER_ROLE_CHANGE':
      return {
        label: `updated member role to ${metadata.role}`,
        icon: Shield,
        badgeBg: 'bg-warning/10 text-warning border-warning/25',
      };
    case 'COMMENT_ADD':
      return {
        label: `posted a comment`,
        subtext: metadata.taskTitle ? `on task "${metadata.taskTitle}"` : undefined,
        icon: MessageSquare,
        badgeBg: 'bg-plum/10 text-plum border-plum/25',
      };
    case 'COMMENT_DELETE':
      return {
        label: `deleted a comment`,
        icon: Trash2,
        badgeBg: 'bg-surface-2 text-fg-muted border-line',
      };
    case 'PROJECT_CREATE':
      return {
        label: `created workspace project "${metadata.name || ''}"`,
        icon: FolderPlus,
        badgeBg: 'bg-success/10 text-success border-success/25',
      };
    case 'PROJECT_ARCHIVE':
      return {
        label: `archived this workspace project`,
        icon: Archive,
        badgeBg: 'bg-warning/10 text-warning border-warning/25',
      };
    default:
      return {
        label: action.toLowerCase().replace(/_/g, ' '),
        icon: Activity,
        badgeBg: 'bg-surface-2 text-fg-muted border-line',
      };
  }
}

export default function ProjectActivityPage({ params }: { params: { id: string } }) {
  const projectId = params.id;
  const { data, isLoading, isError, refetch } = useProjectActivity(projectId);

  const activities = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-fg tracking-tight flex items-center space-x-2">
            <Activity className="h-5 w-5 text-plum" />
            <span>Project Audit Trail</span>
          </h2>
          <p className="text-xs text-fg-muted mt-0.5">
            Immutable timeline of project history, user actions, and status updates.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface h-20 rounded-2xl animate-pulse border border-line" />
          ))}
        </div>
      )}

      {isError && (
        <div className="bg-surface p-6 rounded-2xl border border-danger/25 text-center space-y-3 max-w-md mx-auto shadow-sm">
          <AlertTriangle className="h-8 w-8 text-danger mx-auto" />
          <p className="text-xs text-fg-muted">Failed to load project activity stream.</p>
          <button onClick={() => refetch()} className="px-3 py-1.5 rounded-lg bg-surface-2 text-xs text-fg hover:bg-line">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {!isLoading && !isError && activities.length === 0 && (
        <div className="bg-surface p-12 rounded-2xl border border-line shadow-sm text-center text-xs text-fg-subtle">
          No activity logs recorded for this project yet.
        </div>
      )}

      {!isLoading && !isError && activities.length > 0 && (
        <div className="bg-surface rounded-2xl border border-line shadow-sm p-6 relative">
          {/* Vertical Timeline Line */}
          <div className="absolute left-9 top-8 bottom-8 w-0.5 bg-surface-2 pointer-events-none" />

          <div className="space-y-6 relative">
            {activities.map((act: any) => {
              const meta = getActionMeta(act);
              const ActionIcon = meta.icon;

              return (
                <div key={act.id} className="flex items-start space-x-4 group">
                  {/* User Avatar */}
                  <div
                    className={`h-7 w-7 rounded-full border flex items-center justify-center font-bold text-[10px] shrink-0 z-10 bg-surface ${getAvatarColor(
                      act.userId
                    )}`}
                  >
                    {getInitials(act.user?.name)}
                  </div>

                  {/* Main Event Card */}
                  <div className="flex-1 bg-surface-2 p-4 rounded-xl border border-line/80 shadow-xs space-y-1.5 group-hover:border-line-strong transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-fg text-sm">{act.user?.name || 'System'}</span>
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md border text-[11px] font-medium ${meta.badgeBg}`}>
                          <ActionIcon className="h-3 w-3 shrink-0" />
                          <span>{meta.label}</span>
                        </span>
                      </div>

                      <span className="text-[11px] text-fg-subtle font-medium">
                        {new Date(act.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {meta.subtext && (
                      <p className="text-xs text-fg-muted font-medium">{meta.subtext}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
