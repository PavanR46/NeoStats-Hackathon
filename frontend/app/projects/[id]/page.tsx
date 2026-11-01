'use client';

import React from 'react';
import Link from 'next/link';
import { useProjectDetail } from '@/hooks/useProjects';
import { statusStyles, getInitials, getAvatarColor } from '@/lib/styles';
import { CheckCircle2, Clock, Users, ArrowRight, Kanban } from 'lucide-react';

export default function ProjectOverviewPage({ params }: { params: { id: string } }) {
  const { data } = useProjectDetail(params.id);

  if (!data?.project) return null;
  const project = data.project;

  const tasks = project.tasks || [];
  const totalTasks = tasks.length;
  const todoCount = tasks.filter((t: any) => t.status === 'TODO').length;
  const inProgressCount = tasks.filter((t: any) => t.status === 'IN_PROGRESS').length;
  const inReviewCount = tasks.filter((t: any) => t.status === 'IN_REVIEW').length;
  const doneCount = tasks.filter((t: any) => t.status === 'DONE').length;

  const completionRate = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface p-5 rounded-2xl border border-line/80 shadow-sm">
          <p className="text-xs font-semibold text-fg-subtle uppercase tracking-wider">Completion Rate</p>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-bold text-fg">{completionRate}%</span>
            <span className="text-xs text-fg-muted">of total tasks</span>
          </div>
          <div className="w-full bg-surface-2 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-success h-full transition-all duration-500" style={{ width: `${completionRate}%` }} />
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-line/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-fg-subtle uppercase tracking-wider">Total Tasks</p>
            <p className="text-3xl font-bold text-fg mt-1">{totalTasks}</p>
          </div>
          <Kanban className="h-8 w-8 text-accent opacity-60" />
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-line/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-fg-subtle uppercase tracking-wider">Team Members</p>
            <p className="text-3xl font-bold text-fg mt-1">{project.members.length}</p>
          </div>
          <Users className="h-8 w-8 text-plum opacity-60" />
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-line/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-fg-subtle uppercase tracking-wider">Completed Tasks</p>
            <p className="text-3xl font-bold text-success mt-1">{doneCount}</p>
          </div>
          <CheckCircle2 className="h-8 w-8 text-success opacity-60" />
        </div>
      </div>

      {/* Task Status Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface p-6 rounded-2xl border border-line shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-fg">Task Board Distribution</h3>
            <Link
              href={`/projects/${params.id}/tasks`}
              className="text-xs font-medium text-accent hover:text-accent flex items-center space-x-1"
            >
              <span>Go to Kanban</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-surface-2 border border-line">
              <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full border ${statusStyles.TODO.badge}`}>
                To Do
              </span>
              <p className="text-2xl font-bold text-fg mt-2">{todoCount}</p>
            </div>
            <div className="p-4 rounded-xl bg-surface-2 border border-line">
              <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full border ${statusStyles.IN_PROGRESS.badge}`}>
                In Progress
              </span>
              <p className="text-2xl font-bold text-fg mt-2">{inProgressCount}</p>
            </div>
            <div className="p-4 rounded-xl bg-surface-2 border border-line">
              <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full border ${statusStyles.IN_REVIEW.badge}`}>
                In Review
              </span>
              <p className="text-2xl font-bold text-fg mt-2">{inReviewCount}</p>
            </div>
            <div className="p-4 rounded-xl bg-surface-2 border border-line">
              <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full border ${statusStyles.DONE.badge}`}>
                Done
              </span>
              <p className="text-2xl font-bold text-fg mt-2">{doneCount}</p>
            </div>
          </div>
        </div>

        {/* Members Roster Card */}
        <div className="bg-surface p-6 rounded-2xl border border-line shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-fg">Project Roster</h3>
            <Link
              href={`/projects/${params.id}/team`}
              className="text-xs font-medium text-plum hover:text-plum flex items-center space-x-1"
            >
              <span>Manage Team</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {project.members.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl bg-surface-2 border border-line/80">
                <div className="flex items-center space-x-3">
                  <div className={`h-8 w-8 rounded-full border flex items-center justify-center font-bold text-xs ${getAvatarColor(m.user.id)}`}>
                    {getInitials(m.user.name)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-fg">{m.user.name}</p>
                    <p className="text-xs text-fg-muted">{m.user.email}</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-surface-2 text-fg-muted border border-line">
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
