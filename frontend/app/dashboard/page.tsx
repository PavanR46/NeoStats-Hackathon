'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { useGlobalActivity } from '@/hooks/useActivity';
import { can } from '@/lib/permissions';
import { statusStyles, getInitials, getAvatarColor } from '@/lib/styles';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  Activity,
  Plus,
  ArrowRight,
  RefreshCw,
  Users,
  AlertTriangle,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: projectsData, isLoading: isLoadingProjects, isError: isErrorProjects, refetch: refetchProjects } = useProjects({ limit: 6 });
  const { data: activityData, isLoading: isLoadingActivity, isError: isErrorActivity, refetch: refetchActivity } = useGlobalActivity(1, 8);

  const canCreateProject = can({ globalRole: user?.globalRole }, 'project:create');

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg tracking-tight">
            Welcome back, {user?.name}
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            Here is what is happening across your collaborative workspaces today.
          </p>
        </div>

        {canCreateProject && (
          <Link
            href="/projects"
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white text-sm font-medium shadow-md shadow-brand-500/20 transition-all self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Project</span>
          </Link>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface p-5 rounded-2xl border border-line/80 shadow-sm flex items-center space-x-4">
          <div className="h-12 w-12 rounded-xl bg-accent/10 border border-accent/25 flex items-center justify-center text-accent shrink-0">
            <FolderKanban className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-fg-subtle uppercase tracking-wider">
              Active Projects
            </p>
            <p className="text-2xl font-bold text-fg mt-0.5">
              {isLoadingProjects ? '...' : projectsData?.pagination.total || 0}
            </p>
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-line/80 shadow-sm flex items-center space-x-4">
          <div className="h-12 w-12 rounded-xl bg-success/10 border border-success/25 flex items-center justify-center text-success shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-fg-subtle uppercase tracking-wider">
              Role Permission
            </p>
            <p className="text-sm font-bold text-success mt-0.5 uppercase">
              {user?.globalRole}
            </p>
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-line/80 shadow-sm flex items-center space-x-4">
          <div className="h-12 w-12 rounded-xl bg-plum/10 border border-plum/25 flex items-center justify-center text-plum shrink-0">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-fg-subtle uppercase tracking-wider">
              Recent Activity
            </p>
            <p className="text-2xl font-bold text-fg mt-0.5">
              {isLoadingActivity ? '...' : activityData?.pagination.total || 0}
            </p>
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-line/80 shadow-sm flex items-center space-x-4">
          <div className="h-12 w-12 rounded-xl bg-info/10 border border-info/25 flex items-center justify-center text-info shrink-0">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-fg-subtle uppercase tracking-wider">
              Engine Status
            </p>
            <p className="text-sm font-semibold text-info mt-0.5">
              Socket.IO Connected
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Projects Overview & Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Projects Section (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-fg flex items-center space-x-2">
              <FolderKanban className="h-5 w-5 text-accent" />
              <span>Your Workspaces</span>
            </h2>
            <Link
              href="/projects"
              className="text-xs font-medium text-accent hover:text-accent flex items-center space-x-1 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Loading Skeletons */}
          {isLoadingProjects && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-surface p-5 rounded-2xl border border-line animate-pulse h-36" />
              ))}
            </div>
          )}

          {/* Error State */}
          {isErrorProjects && (
            <div className="bg-surface p-6 rounded-2xl border border-danger/25 text-center space-y-3 shadow-sm">
              <AlertTriangle className="h-8 w-8 text-danger mx-auto" />
              <p className="text-sm text-fg-muted">Failed to load workspace projects.</p>
              <button
                onClick={() => refetchProjects()}
                className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-line text-xs font-medium text-fg transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoadingProjects && !isErrorProjects && projectsData?.data.length === 0 && (
            <div className="bg-surface p-8 rounded-2xl border border-line shadow-sm text-center space-y-4">
              <FolderKanban className="h-10 w-10 text-fg-subtle mx-auto" />
              <div>
                <h3 className="text-base font-semibold text-fg">No Projects Found</h3>
                <p className="text-xs text-fg-muted mt-1">You are not a member of any active projects yet.</p>
              </div>
              {canCreateProject && (
                <Link
                  href="/projects"
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Project</span>
                </Link>
              )}
            </div>
          )}

          {/* Projects List Grid */}
          {!isLoadingProjects && !isErrorProjects && projectsData && projectsData.data.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {projectsData.data.map((project: any) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="bg-surface p-5 rounded-2xl block border border-line shadow-sm hover:border-accent/40 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="text-base font-semibold text-fg group-hover:text-accent transition-colors line-clamp-1">
                      {project.name}
                    </h3>
                    <span className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-surface-2 text-fg-muted border border-line">
                      {project.currentUserRole}
                    </span>
                  </div>

                  <p className="text-xs text-fg-muted mt-2 line-clamp-2 min-h-[2.5rem]">
                    {project.description || 'No description provided.'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs text-fg-subtle">
                    <div className="flex items-center space-x-3 text-fg-muted">
                      <span className="flex items-center space-x-1">
                        <Users className="h-3.5 w-3.5" />
                        <span>{project.memberCount} members</span>
                      </span>
                      <span>•</span>
                      <span>{project.taskCount} tasks</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-fg-subtle group-hover:text-accent group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Activity Stream Sidebar (1 Col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-fg flex items-center space-x-2">
              <Activity className="h-5 w-5 text-plum" />
              <span>Live Audit Activity</span>
            </h2>
          </div>

          <div className="bg-surface p-4 rounded-2xl border border-line shadow-sm space-y-4">
            {isLoadingActivity && (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-surface-2 rounded-xl animate-pulse" />
                ))}
              </div>
            )}

            {isErrorActivity && (
              <div className="text-center py-4 text-xs text-danger">
                Failed to load activity stream.
              </div>
            )}

            {!isLoadingActivity && !isErrorActivity && activityData?.data.length === 0 && (
              <div className="text-center py-6 text-xs text-fg-subtle">
                No recent activity recorded yet.
              </div>
            )}

            {!isLoadingActivity && !isErrorActivity && activityData && activityData.data.length > 0 && (
              <div className="space-y-3">
                {activityData.data.map((act: any) => {
                  const actionText = (() => {
                    const m = act.metadata || {};
                    switch (act.action) {
                      case 'TASK_CREATE': return `created task "${m.title || 'task'}"`;
                      case 'TASK_UPDATE': return m.status ? `changed status to ${m.status.replace(/_/g, ' ')}` : `updated task "${m.title || ''}"`;
                      case 'TASK_DELETE': return `deleted task`;
                      case 'MEMBER_ADD': return `added a project member`;
                      case 'MEMBER_REMOVE': return `removed a project member`;
                      case 'MEMBER_ROLE_CHANGE': return `updated role to ${m.role}`;
                      case 'COMMENT_ADD': return `posted a comment`;
                      case 'COMMENT_DELETE': return `deleted a comment`;
                      case 'PROJECT_CREATE': return `created project "${m.name || ''}"`;
                      case 'PROJECT_ARCHIVE': return `archived project`;
                      default: return act.action.toLowerCase().replace(/_/g, ' ');
                    }
                  })();

                  return (
                    <div key={act.id} className="flex items-start space-x-3 text-xs p-2.5 rounded-xl bg-surface-2 border border-line/80">
                      <div
                        className={`h-7 w-7 rounded-full border flex items-center justify-center font-bold shrink-0 mt-0.5 ${getAvatarColor(
                          act.userId
                        )}`}
                      >
                        {getInitials(act.user?.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-fg-muted">
                          <span className="font-semibold text-fg">{act.user?.name || 'System'}</span>{' '}
                          <span className="text-fg-muted font-medium">{actionText}</span>
                        </p>
                        {act.project && (
                          <p className="text-[11px] text-fg-subtle truncate mt-0.5">
                            in {act.project.name}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
