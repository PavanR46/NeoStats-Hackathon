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
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completion Rate</p>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-3xl font-bold text-slate-900">{completionRate}%</span>
            <span className="text-xs text-slate-500">of total tasks</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${completionRate}%` }} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Tasks</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{totalTasks}</p>
          </div>
          <Kanban className="h-8 w-8 text-brand-600 opacity-60" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Team Members</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{project.members.length}</p>
          </div>
          <Users className="h-8 w-8 text-purple-600 opacity-60" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed Tasks</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{doneCount}</p>
          </div>
          <CheckCircle2 className="h-8 w-8 text-emerald-600 opacity-60" />
        </div>
      </div>

      {/* Task Status Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Task Board Distribution</h3>
            <Link
              href={`/projects/${params.id}/tasks`}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center space-x-1"
            >
              <span>Go to Kanban</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full border ${statusStyles.TODO.badge}`}>
                To Do
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-2">{todoCount}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full border ${statusStyles.IN_PROGRESS.badge}`}>
                In Progress
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-2">{inProgressCount}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full border ${statusStyles.IN_REVIEW.badge}`}>
                In Review
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-2">{inReviewCount}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full border ${statusStyles.DONE.badge}`}>
                Done
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-2">{doneCount}</p>
            </div>
          </div>
        </div>

        {/* Members Roster Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Project Roster</h3>
            <Link
              href={`/projects/${params.id}/team`}
              className="text-xs font-medium text-purple-600 hover:text-purple-700 flex items-center space-x-1"
            >
              <span>Manage Team</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {project.members.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center space-x-3">
                  <div className={`h-8 w-8 rounded-full border flex items-center justify-center font-bold text-xs ${getAvatarColor(m.user.id)}`}>
                    {getInitials(m.user.name)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{m.user.name}</p>
                    <p className="text-xs text-slate-500">{m.user.email}</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-slate-100 text-slate-700 border border-slate-200">
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
