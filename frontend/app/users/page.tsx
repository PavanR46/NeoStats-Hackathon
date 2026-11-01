'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { userApi } from '@/lib/api';
import { getInitials, getAvatarColor } from '@/lib/styles';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Users, UserPlus, Search, ShieldAlert, RefreshCw, AlertTriangle, X } from 'lucide-react';

export default function UsersAdminPage() {
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

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.users.list({ page, limit: 10, search, isActive }),
    queryFn: () => userApi.list({ page, limit: 10, search: search || undefined, isActive }),
    enabled: user?.globalRole === 'ADMIN',
  });

  if (user?.globalRole !== 'ADMIN') {
    return (
      <div className="bg-surface p-8 rounded-2xl border border-danger/25 shadow-sm text-center space-y-3 max-w-md mx-auto mt-12">
        <ShieldAlert className="h-10 w-10 text-danger mx-auto" />
        <h2 className="text-lg font-bold text-fg">Access Denied</h2>
        <p className="text-xs text-fg-muted">User Administration requires global system ADMIN privileges.</p>
      </div>
    );
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await userApi.create({ name, email, password, globalRole });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm('Are you sure you want to soft-deactivate this user account?')) return;

    try {
      await userApi.deactivate(userId);
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    } catch (err: any) {
      alert(err.message || 'Failed to deactivate user');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg tracking-tight flex items-center space-x-2">
            <Users className="h-6 w-6 text-plum" />
            <span>User Administration</span>
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            Global system governance, user onboarding, and soft-deactivations.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white text-sm font-semibold shadow-md shadow-brand-500/20 transition-all self-start sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          <span>New User Account</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface p-4 rounded-2xl border border-line shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-subtle" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-surface-2 border border-line rounded-xl pl-10 pr-4 py-2 text-sm text-fg placeholder-fg-subtle focus:outline-none focus:bg-surface focus:border-accent/60"
          />
        </div>

        <div className="flex items-center space-x-2 bg-surface-2 p-1 rounded-xl border border-line">
          <button
            onClick={() => {
              setIsActive(undefined);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isActive === undefined ? 'bg-surface text-accent shadow-sm font-semibold' : 'text-fg-muted hover:text-fg'
            }`}
          >
            All Users
          </button>
          <button
            onClick={() => {
              setIsActive(true);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isActive === true ? 'bg-success text-white shadow-sm font-semibold' : 'text-fg-muted hover:text-fg'
            }`}
          >
            Active Only
          </button>
          <button
            onClick={() => {
              setIsActive(false);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isActive === false ? 'bg-danger text-white shadow-sm font-semibold' : 'text-fg-muted hover:text-fg'
            }`}
          >
            Deactivated
          </button>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface h-16 rounded-2xl animate-pulse border border-line" />
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="bg-surface p-8 rounded-2xl border border-danger/25 text-center space-y-3 max-w-md mx-auto shadow-sm">
          <AlertTriangle className="h-10 w-10 text-danger mx-auto" />
          <h3 className="text-base font-semibold text-fg">Unable to load users</h3>
          <button onClick={() => refetch()} className="px-3 py-1.5 rounded-lg bg-surface-2 text-xs text-fg hover:bg-line">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Users Table List */}
      {!isLoading && !isError && data && (
        <div className="bg-surface rounded-2xl border border-line shadow-sm divide-y divide-line overflow-hidden">
          {data.data.map((u: any) => (
            <div key={u.id} className="p-4 flex items-center justify-between hover:bg-surface-2 transition-colors">
              <div className="flex items-center space-x-3">
                <div className={`h-10 w-10 rounded-full border flex items-center justify-center font-bold text-xs ${getAvatarColor(u.id)}`}>
                  {getInitials(u.name)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-semibold text-fg">{u.name}</p>
                    {!u.isActive && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full bg-danger/10 text-danger border border-danger/25">
                        Deactivated
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-fg-muted">{u.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                  u.globalRole === 'ADMIN' ? 'bg-plum/15 text-plum border-plum/25' : 'bg-surface-2 text-fg-muted border-line'
                }`}>
                  {u.globalRole}
                </span>

                {u.isActive && u.id !== user?.id && (
                  <button
                    onClick={() => handleDeactivateUser(u.id)}
                    className="px-3 py-1.5 rounded-lg bg-danger/10 hover:bg-danger/15 text-danger border border-danger/25 text-xs font-medium transition-colors"
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE USER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface p-6 rounded-2xl border border-line shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-lg font-bold text-fg">Create User Account</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-fg-subtle hover:text-fg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-danger/10 border border-danger/25 text-danger text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface-2 border border-line rounded-xl px-3.5 py-2 text-sm text-fg focus:outline-none focus:bg-surface focus:border-accent/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="jane@neostats.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-2 border border-line rounded-xl px-3.5 py-2 text-sm text-fg focus:outline-none focus:bg-surface focus:border-accent/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-2 border border-line rounded-xl px-3.5 py-2 text-sm text-fg focus:outline-none focus:bg-surface focus:border-accent/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">
                  Global Role
                </label>
                <select
                  value={globalRole}
                  onChange={(e) => setGlobalRole(e.target.value)}
                  className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs text-fg focus:outline-none"
                >
                  <option value="USER">USER (Regular User)</option>
                  <option value="ADMIN">ADMIN (Global Administrator)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-2 text-xs text-fg-muted hover:bg-line"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-xs font-semibold text-white shadow-md"
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
