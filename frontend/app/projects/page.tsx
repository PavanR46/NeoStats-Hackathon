'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { projectApi } from '@/lib/api';
import { can } from '@/lib/permissions';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  FolderKanban,
  Search,
  Plus,
  Archive,
  Users,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  X,
} from 'lucide-react';

export default function ProjectsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [isArchived, setIsArchived] = useState<boolean>(false);
  const [page, setPage] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useProjects({
    page,
    limit: 6,
    search: search || undefined,
    isArchived,
  });

  const canCreate = can({ globalRole: user?.globalRole }, 'project:create');

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await projectApi.create(name, description);
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      setIsModalOpen(false);
      setName('');
      setDescription('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveProject = async (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to archive this project?')) return;

    try {
      await projectApi.archive(projectId);
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    } catch (err: any) {
      alert(err.message || 'Failed to archive project');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <FolderKanban className="h-6 w-6 text-brand-600" />
            <span>Workspace Projects</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your collaborative project boards and team memberships.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white text-sm font-medium shadow-md shadow-brand-500/20 transition-all self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>New Project</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-500 transition-all"
          />
        </div>

        {/* Tab Filter: Active vs Archived */}
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => {
              setIsArchived(false);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !isArchived ? 'bg-white text-brand-700 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Projects
          </button>
          <button
            onClick={() => {
              setIsArchived(true);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isArchived ? 'bg-amber-500 text-white shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Archived
          </button>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 animate-pulse h-44" />
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="bg-white p-8 rounded-2xl border border-rose-200 shadow-sm text-center space-y-3">
          <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800">Unable to load projects</h3>
          <p className="text-xs text-slate-500">An unexpected error occurred while querying the server.</p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-800 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && data?.data.length === 0 && (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
          <FolderKanban className="h-12 w-12 text-slate-400 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-slate-800">No Projects Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {isArchived
                ? 'There are currently no archived projects in the system.'
                : 'No projects match your search query or membership list.'}
            </p>
          </div>
          {canCreate && !isArchived && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Project</span>
            </button>
          )}
        </div>
      )}

      {/* Projects Grid */}
      {!isLoading && !isError && data && data.data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.data.map((project: any) => {
            const canArchive =
              !project.isArchived &&
              can(
                { globalRole: user?.globalRole, projectRole: project.currentUserRole },
                'project:archive'
              );

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="bg-white p-6 rounded-2xl block border border-slate-200 shadow-sm hover:border-brand-300 hover:shadow-md transition-all group relative"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-semibold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1">
                    {project.name}
                  </h3>
                  <div className="flex items-center space-x-2">
                    {project.isArchived ? (
                      <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Archived
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {project.currentUserRole}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-2 line-clamp-2 min-h-[2.5rem]">
                  {project.description || 'No description provided.'}
                </p>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center space-x-3 text-slate-500">
                    <span className="flex items-center space-x-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>{project.memberCount} members</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{project.taskCount} tasks</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {canArchive && (
                      <button
                        onClick={(e) => handleArchiveProject(e, project.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        title="Archive Project"
                        aria-label="Archive project"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    )}
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 text-xs text-slate-500">
          <span>
            Page {data.pagination.page} of {data.pagination.totalPages}
          </span>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-50 text-slate-700 transition-colors"
            >
              Previous
            </button>
            <button
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-50 text-slate-700 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white p-6 rounded-2xl border border-slate-200 shadow-xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Create New Project</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. E-Commerce Redesign"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the scope and objectives of this project..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-xs font-medium text-white shadow-md transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
