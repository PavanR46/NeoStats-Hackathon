'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { projectApi, memberApi, userApi, activityApi } from '@/lib/api';
import { getInitials, getAvatarColor } from '@/lib/styles';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  Briefcase,
  FolderPlus,
  Users,
  UserPlus,
  CheckCircle2,
  FolderKanban,
  Activity,
  Archive,
  ArrowRight,
  ShieldAlert,
  Search,
  X,
  UserMinus,
  RefreshCw,
} from 'lucide-react';

export default function PMConsolePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterArchived, setFilterArchived] = useState<boolean>(false);

  // New Project Modal State
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const [projectFormError, setProjectFormError] = useState<string | null>(null);

  // Roster Management Modal State
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectName, setSelectedProjectName] = useState<string>('');
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('MEMBER');
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [memberFormError, setMemberFormError] = useState<string | null>(null);

  // Query Projects
  const { data: projectsData, isLoading: isProjectsLoading, isError: isProjectsError, refetch: refetchProjects } = useQuery({
    queryKey: queryKeys.projects.list({ search, isArchived: filterArchived }),
    queryFn: () => projectApi.list({ search: search || undefined, isArchived: filterArchived }),
    enabled: !!user,
  });

  // Query All Users (for roster assignment dropdown)
  const { data: usersData } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: () => userApi.list({ limit: 100, isActive: true }),
    enabled: !!selectedProjectId,
  });

  // Query Project Members when Roster Modal is active
  const { data: membersData, refetch: refetchMembers } = useQuery({
    queryKey: selectedProjectId ? queryKeys.members.list(selectedProjectId) : ['none'],
    queryFn: () => (selectedProjectId ? memberApi.list(selectedProjectId) : Promise.resolve({ members: [] })),
    enabled: !!selectedProjectId,
  });

  // Query PM Workspace Activity
  const { data: activityData } = useQuery({
    queryKey: queryKeys.activity.global,
    queryFn: () => activityApi.list(undefined, 1, 10),
    enabled: !!user,
  });

  // Compute PM Metrics
  const projectsList = projectsData?.data || [];
  const activeProjectsCount = projectsList.filter((p: any) => !p.isArchived).length;
  const archivedProjectsCount = projectsList.filter((p: any) => p.isArchived).length;

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setProjectFormError(null);
    setIsSubmittingProject(true);

    try {
      await projectApi.create(projectName, projectDesc);
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      setIsProjectModalOpen(false);
      setProjectName('');
      setProjectDesc('');
    } catch (err: any) {
      setProjectFormError(err.message || 'Failed to create project');
    } finally {
      setIsSubmittingProject(false);
    }
  };

  const handleArchiveProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to archive this project?')) return;
    try {
      await projectApi.archive(projectId);
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    } catch (err: any) {
      alert(err.message || 'Failed to archive project');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !newMemberUserId) return;
    setMemberFormError(null);
    setIsSubmittingMember(true);

    try {
      await memberApi.add(selectedProjectId, { userId: newMemberUserId, role: newMemberRole });
      queryClient.invalidateQueries({ queryKey: queryKeys.members.list(selectedProjectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      setNewMemberUserId('');
      refetchMembers();
    } catch (err: any) {
      setMemberFormError(err.message || 'Failed to add team member');
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedProjectId) return;
    if (!confirm('Are you sure you want to remove this member from the project roster?')) return;

    try {
      await memberApi.remove(selectedProjectId, memberId);
      queryClient.invalidateQueries({ queryKey: queryKeys.members.list(selectedProjectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      refetchMembers();
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-brand-900 via-indigo-900 to-purple-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-72 h-72 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-brand-200">
              <Briefcase className="h-3.5 w-3.5 text-brand-300" />
              <span>Project Management Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Project Manager Portal</h1>
            <p className="text-sm text-slate-200 max-w-xl">
              Drive execution across workspace projects, curate team member roles, and direct task workstreams.
            </p>
          </div>

          <button
            onClick={() => setIsProjectModalOpen(true)}
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-white text-brand-900 hover:bg-brand-50 font-bold text-sm shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 self-start sm:self-auto"
          >
            <FolderPlus className="h-4 w-4 text-brand-600" />
            <span>Create New Project</span>
          </button>
        </div>
      </div>

      {/* PM Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Projects</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{activeProjectsCount}</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Live & Tracked
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <FolderKanban className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Archived Workstreams</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{archivedProjectsCount}</p>
            <p className="text-[11px] text-slate-500 mt-1">Completed / Suspended</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Archive className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Managed Roster</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {projectsList.reduce((acc: number, p: any) => acc + (p._count?.members || 0), 0)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Total Member Assignments</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: PM Projects Control & Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Managed Projects Control (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-500"
              />
            </div>

            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setFilterArchived(false)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  !filterArchived ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active Projects
              </button>
              <button
                onClick={() => setFilterArchived(true)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  filterArchived ? 'bg-amber-600 text-white shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Archived
              </button>
            </div>
          </div>

          {/* Projects List / Grid */}
          {isProjectsLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-white animate-pulse rounded-2xl border border-slate-200" />
              ))}
            </div>
          )}

          {isProjectsError && (
            <div className="bg-white p-8 rounded-2xl border border-rose-200 text-center space-y-2">
              <ShieldAlert className="h-8 w-8 text-rose-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">Failed to load PM project list</p>
              <button onClick={() => refetchProjects()} className="text-xs text-brand-600 hover:underline">Retry</button>
            </div>
          )}

          {!isProjectsLoading && !isProjectsError && projectsList.length === 0 && (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
              <FolderKanban className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No projects found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Create a project to start assigning team members and managing task workflows.
              </p>
            </div>
          )}

          {!isProjectsLoading && !isProjectsError && projectsList.map((p: any) => (
            <div
              key={p.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-slate-900 hover:text-brand-600 transition-colors">
                      <Link href={`/projects/${p.id}`}>{p.name}</Link>
                    </h3>
                    {p.isArchived && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        Archived
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{p.description || 'No description provided.'}</p>
                </div>

                <div className="flex items-center space-x-2 self-start sm:self-auto">
                  <button
                    onClick={() => {
                      setSelectedProjectId(p.id);
                      setSelectedProjectName(p.name);
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200/80 transition-colors"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>Roster ({p._count?.members || 0})</span>
                  </button>

                  <Link
                    href={`/projects/${p.id}`}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold border border-brand-200/80 transition-colors"
                  >
                    <span>Board</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>

                  {!p.isArchived && (
                    <button
                      onClick={() => handleArchiveProject(p.id)}
                      className="p-1.5 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-700 border border-slate-200 transition-colors"
                      title="Archive Project"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Task Count Details Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                <span>Total Tasks: <strong className="text-slate-800">{p._count?.tasks || 0}</strong></span>
                <span>Created {new Date(p.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>

        {/* PM Activity Stream (1 Col) */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <Activity className="h-4 w-4 text-brand-600" />
                <span>PM Activity Stream</span>
              </h3>
              <span className="text-[10px] font-bold uppercase text-slate-400">Live</span>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {activityData?.data?.map((act: any) => (
                <div key={act.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{act.user?.name || 'Team Member'}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-600">
                    <span className="font-medium text-brand-600">{act.action}</span> - {act.entityType}
                  </p>
                </div>
              ))}

              {(!activityData?.data || activityData.data.length === 0) && (
                <p className="text-xs text-slate-400 text-center py-6">No recent project activity.</p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* CREATE PROJECT MODAL */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white p-6 rounded-2xl border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <FolderPlus className="h-5 w-5 text-brand-600" />
                <span>Create New Project</span>
              </h3>
              <button onClick={() => setIsProjectModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            {projectFormError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {projectFormError}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Mobile App Redesign"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Summary of project scope and objectives..."
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-brand-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProject}
                  className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-xs font-bold text-white shadow-md shadow-brand-500/20"
                >
                  {isSubmittingProject ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROJECT ROSTER MANAGEMENT MODAL */}
      {selectedProjectId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white p-6 rounded-2xl border border-slate-200 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  <span>Project Team Roster</span>
                </h3>
                <p className="text-xs text-slate-500">{selectedProjectName}</p>
              </div>
              <button onClick={() => setSelectedProjectId(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Add Member Form */}
            {memberFormError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {memberFormError}
              </div>
            )}

            <form onSubmit={handleAddMember} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Add Team Member</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <select
                    value={newMemberUserId}
                    onChange={(e) => setNewMemberUserId(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="">Select a user account...</option>
                    {usersData?.data?.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="MEMBER">MEMBER</option>
                    <option value="PROJECT_MANAGER">PM</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingMember || !newMemberUserId}
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center space-x-1"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>{isSubmittingMember ? 'Adding...' : 'Add Member to Project'}</span>
              </button>
            </form>

            {/* Current Member Roster List */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Current Roster</p>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                {membersData?.members?.map((m: any) => (
                  <div key={m.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center space-x-3">
                      <div className={`h-8 w-8 rounded-full border flex items-center justify-center font-bold text-xs ${getAvatarColor(m.user?.id)}`}>
                        {getInitials(m.user?.name)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{m.user?.name}</p>
                        <p className="text-[11px] text-slate-500">{m.user?.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {m.role}
                      </span>
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Remove member"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {(!membersData?.members || membersData.members.length === 0) && (
                  <p className="text-xs text-slate-400 text-center py-4">No team members assigned yet.</p>
                )}
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedProjectId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
