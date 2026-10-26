'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProjectDetail } from '@/hooks/useProjects';
import { useSocket } from '@/components/SocketProvider';
import { LayoutDashboard, CheckSquare, Users, Activity, Archive, AlertCircle } from 'lucide-react';

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const projectId = params.id;
  const pathname = usePathname();
  const { joinProjectRoom, leaveProjectRoom } = useSocket();
  const { data, isLoading, isError } = useProjectDetail(projectId);

  useEffect(() => {
    if (projectId) {
      joinProjectRoom(projectId);
      return () => {
        leaveProjectRoom(projectId);
      };
    }
  }, [projectId, joinProjectRoom, leaveProjectRoom]);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 animate-pulse h-32" />
        <div className="h-64 bg-white rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (isError || !data?.project) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-rose-200 shadow-sm text-center space-y-3 max-w-lg mx-auto mt-12">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Project Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested project does not exist or you lack membership permissions.
        </p>
        <Link
          href="/projects"
          className="inline-block px-4 py-2 rounded-xl bg-slate-100 text-xs text-slate-800 font-medium hover:bg-slate-200 transition-colors"
        >
          Return to Projects
        </Link>
      </div>
    );
  }

  const project = data.project;

  const tabs = [
    { label: 'Overview', href: `/projects/${projectId}`, icon: LayoutDashboard },
    { label: 'Tasks Board', href: `/projects/${projectId}/tasks`, icon: CheckSquare },
    { label: 'Team Members', href: `/projects/${projectId}/team`, icon: Users },
    { label: 'Activity Log', href: `/projects/${projectId}/activity`, icon: Activity },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Archive Warning Banner */}
      {project.isArchived && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center space-x-3 text-amber-800 text-xs">
          <Archive className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            <strong>Project Archived:</strong> This workspace is in read-only mode. Further edits or task creations are disabled.
          </span>
        </div>
      )}

      {/* Project Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{project.name}</h1>
              <span className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {project.currentUserRole}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {project.description || 'No description provided.'}
            </p>
          </div>
        </div>

        {/* Tab Sub-Navigation */}
        <div className="flex items-center space-x-1 border-t border-slate-100 pt-4 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive =
              tab.href === `/projects/${projectId}`
                ? pathname === `/projects/${projectId}`
                : pathname?.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Tab Viewport */}
      <div>{children}</div>
    </div>
  );
}
