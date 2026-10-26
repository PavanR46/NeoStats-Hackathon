'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { userApi, projectApi, activityApi } from '@/lib/api';
import { getInitials, getAvatarColor } from '@/lib/styles';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  ShieldCheck,
  Users,
  UserPlus,
  Search,
  ShieldAlert,
  RefreshCw,
  AlertTriangle,
  X,
  FolderKanban,
  Activity,
  UserCheck,
  UserX,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export default function AdminPortalPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [globalRole, setGlobalRole] = useState('USER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Users Query
  const { data: usersData, isLoading: isUsersLoading, isError: isUsersError, refetch: refetchUsers } = useQuery({
    queryKey: queryKeys.users.list({ page, limit: 10, search, isActive }),
    queryFn: () => userApi.list({ page, limit: 10, search: search || undefined, isActive }),
    enabled: user?.globalRole === 'ADMIN',
  });

  // System Stats Queries
  const { data: allUsers } = useQuery({
    queryKey: ['admin', 'allUsersSummary'],
    queryFn: () => userApi.list({ limit: 100 }),
    enabled: user?.globalRole === 'ADMIN',
  });

  const { data: projectsData } = useQuery({
    queryKey: ['admin', 'allProjectsSummary'],
    queryFn: () => projectApi.list({ limit: 100 }),
    enabled: user?.globalRole === 'ADMIN',
  });

  const { data: auditData } = useQuery({
    queryKey: queryKeys.activity.global,
    queryFn: () => activityApi.list(undefined, 1, 10),
    enabled: user?.globalRole === 'ADMIN',
  });

  if (user?.globalRole !== 'ADMIN') {
    return (
      <div className="bg-white p-8 rounded-2xl border border-rose-200 shadow-sm text-center space-y-4 max-w-md mx-auto mt-16">
        <div className="h-14 w-14 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center mx-auto text-rose-600">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Admin Access Restricted</h2>
          <p className="text-sm text-slate-500 mt-1">
            The Admin Portal is exclusive to System Administrators with global privileges.
          </p>
        </div>
      </div>
    );
  }

  // Calculate Metrics
  const totalUsersCount = allUsers?.data?.length || 0;
  const activeUsersCount = allUsers?.data?.filter((u: any) => u.isActive).length || 0;
  const deactivatedUsersCount = totalUsersCount - activeUsersCount;
  const adminUsersCount = allUsers?.data?.filter((u: any) => u.globalRole === 'ADMIN').length || 0;
  const totalProjectsCount = projectsData?.data?.length || 0;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await userApi.create({ name, email, password, globalRole });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: ['admin', 'allUsersSummary'] });
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to create user account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm('Are you sure you want to soft-deactivate this user account?')) return;

    try {
      await userApi.deactivate(userId);
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: ['admin', 'allUsersSummary'] });
    } catch (err: any) {
      alert(err.message || 'Failed to deactivate user');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-indigo-200">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-300" />
              <span>System Governance & Security</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Portal</h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Manage platform user accounts, enforce global security roles, and monitor system-wide audit activity logs.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-white text-slate-900 hover:bg-indigo-50 font-bold text-sm shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 self-start sm:self-auto"
          >
            <UserPlus className="h-4 w-4 text-indigo-600" />
            <span>Onboard New User</span>
          </button>
        </div>
      </div>

      {/* Admin Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Accounts</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalUsersCount}</p>
            <p className="text-[11px] text-slate-500 mt-1">{activeUsersCount} active / {deactivatedUsersCount} inactive</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Global Admins</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{adminUsersCount}</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Elevated Access
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Lock className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">System Projects</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalProjectsCount}</p>
            <p className="text-[11px] text-slate-500 mt-1">Across workspace</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FolderKanban className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Users</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{activeUsersCount}</p>
            <p className="text-[11px] text-slate-500 mt-1">Provisioned & Active</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: User Governance Table & Global Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* User Governance Roster (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search user name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => { setIsActive(undefined); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  isActive === undefined ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({totalUsersCount})
              </button>
              <button
                onClick={() => { setIsActive(true); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  isActive === true ? 'bg-emerald-600 text-white shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => { setIsActive(false); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  isActive === false ? 'bg-rose-600 text-white shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Deactivated
              </button>
            </div>
          </div>

          {/* User Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-indigo-600" />
                <span>User Accounts Directory</span>
              </h3>
              <span className="text-xs text-slate-400">Page {page}</span>
            </div>

            {isUsersLoading && (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-slate-50 animate-pulse rounded-xl" />
                ))}
              </div>
            )}

            {isUsersError && (
              <div className="p-8 text-center space-y-2">
                <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-800">Failed to load user accounts</p>
                <button onClick={() => refetchUsers()} className="text-xs text-indigo-600 hover:underline">Retry</button>
              </div>
            )}

            {!isUsersLoading && !isUsersError && usersData && (
              <div className="divide-y divide-slate-100">
                {usersData.data.map((u: any) => (
                  <div key={u.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                    <div className="flex items-center space-x-3.5">
                      <div className={`h-10 w-10 rounded-full border flex items-center justify-center font-bold text-xs ${getAvatarColor(u.id)}`}>
                        {getInitials(u.name)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-bold text-slate-900">{u.name}</p>
                          {!u.isActive && (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border ${
                        u.globalRole === 'ADMIN'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {u.globalRole}
                      </span>

                      {u.isActive && u.id !== user?.id && (
                        <button
                          onClick={() => handleDeactivateUser(u.id)}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors"
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Global Audit & Activity Trail (1 Col) */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <Activity className="h-4 w-4 text-indigo-600" />
                <span>Global System Audit</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Live Stream</span>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {auditData?.data?.map((act: any) => (
                <div key={act.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{act.user?.name || 'System User'}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-600">
                    <span className="font-medium text-indigo-600">{act.action}</span> - {act.entityType}
                  </p>
                  {act.details && (
                    <p className="text-[11px] text-slate-400 italic truncate">
                      {typeof act.details === 'string' ? act.details : JSON.stringify(act.details)}
                    </p>
                  )}
                </div>
              ))}

              {(!auditData?.data || auditData.data.length === 0) && (
                <p className="text-xs text-slate-400 text-center py-6">No recent audit logs found.</p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* CREATE USER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white p-6 rounded-2xl border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <UserPlus className="h-5 w-5 text-indigo-600" />
                <span>Create User Account</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Morgan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="alex@neostats.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Global Role
                </label>
                <select
                  value={globalRole}
                  onChange={(e) => setGlobalRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none"
                >
                  <option value="USER">USER (Standard Member)</option>
                  <option value="ADMIN">ADMIN (Global Administrator)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-md shadow-indigo-500/20"
                >
                  {isSubmitting ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
