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
        badgeBg: 'bg-brand-50 text-brand-700 border-brand-200',
      };
    case 'TASK_UPDATE':
      if (metadata.status) {
        return {
          label: `updated task status to ${metadata.status.replace(/_/g, ' ')}`,
          subtext: metadata.title || metadata.taskTitle ? `Task: "${metadata.title || metadata.taskTitle}"` : undefined,
          icon: CheckCircle2,
          badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      }
      return {
        label: `updated task "${metadata.title || metadata.taskTitle || ''}"`,
        icon: Edit3,
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    case 'TASK_DELETE':
      return {
        label: `deleted task "${metadata.title || ''}"`,
        icon: Trash2,
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    case 'MEMBER_ADD':
      return {
        label: `added a new project member`,
        subtext: metadata.role ? `Assigned Role: ${metadata.role}` : undefined,
        icon: UserPlus,
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
      };
    case 'MEMBER_REMOVE':
      return {
        label: `removed a member from the project`,
        icon: UserMinus,
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    case 'MEMBER_ROLE_CHANGE':
      return {
        label: `updated member role to ${metadata.role}`,
        icon: Shield,
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    case 'COMMENT_ADD':
      return {
        label: `posted a comment`,
        subtext: metadata.taskTitle ? `on task "${metadata.taskTitle}"` : undefined,
        icon: MessageSquare,
        badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      };
    case 'COMMENT_DELETE':
      return {
        label: `deleted a comment`,
        icon: Trash2,
        badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
      };
    case 'PROJECT_CREATE':
      return {
        label: `created workspace project "${metadata.name || ''}"`,
        icon: FolderPlus,
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'PROJECT_ARCHIVE':
      return {
        label: `archived this workspace project`,
        icon: Archive,
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    default:
      return {
        label: action.toLowerCase().replace(/_/g, ' '),
        icon: Activity,
        badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
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
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Activity className="h-5 w-5 text-purple-600" />
            <span>Project Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable timeline of project history, user actions, and status updates.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white h-20 rounded-2xl animate-pulse border border-slate-200" />
          ))}
        </div>
      )}

      {isError && (
        <div className="bg-white p-6 rounded-2xl border border-rose-200 text-center space-y-3 max-w-md mx-auto shadow-sm">
          <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
          <p className="text-xs text-slate-700">Failed to load project activity stream.</p>
          <button onClick={() => refetch()} className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs text-slate-800 hover:bg-slate-200">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {!isLoading && !isError && activities.length === 0 && (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center text-xs text-slate-400">
          No activity logs recorded for this project yet.
        </div>
      )}

      {!isLoading && !isError && activities.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative">
          {/* Vertical Timeline Line */}
          <div className="absolute left-9 top-8 bottom-8 w-0.5 bg-slate-100 pointer-events-none" />

          <div className="space-y-6 relative">
            {activities.map((act: any) => {
              const meta = getActionMeta(act);
              const ActionIcon = meta.icon;

              return (
                <div key={act.id} className="flex items-start space-x-4 group">
                  {/* User Avatar */}
                  <div
                    className={`h-7 w-7 rounded-full border flex items-center justify-center font-bold text-[10px] shrink-0 z-10 bg-white ${getAvatarColor(
                      act.userId
                    )}`}
                  >
                    {getInitials(act.user?.name)}
                  </div>

                  {/* Main Event Card */}
                  <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-1.5 group-hover:border-slate-300 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-900 text-sm">{act.user?.name || 'System'}</span>
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md border text-[11px] font-medium ${meta.badgeBg}`}>
                          <ActionIcon className="h-3 w-3 shrink-0" />
                          <span>{meta.label}</span>
                        </span>
                      </div>

                      <span className="text-[11px] text-slate-400 font-medium">
                        {new Date(act.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {meta.subtext && (
                      <p className="text-xs text-slate-600 font-medium">{meta.subtext}</p>
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
