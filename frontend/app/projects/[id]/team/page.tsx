'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useProjectDetail } from '@/hooks/useProjects';
import { useMembers } from '@/hooks/useMembers';
import { memberApi, userApi } from '@/lib/api';
import { can } from '@/lib/permissions';
import { getInitials, getAvatarColor } from '@/lib/styles';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Users, UserPlus, Trash2, AlertTriangle, RefreshCw, X } from 'lucide-react';

export default function ProjectTeamPage({ params }: { params: { id: string } }) {
  const projectId = params.id;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: projectData } = useProjectDetail(projectId);
  const { data: membersData, isLoading, isError, refetch } = useMembers(projectId);

  const currentUserRole = projectData?.project?.currentUserRole;
  const isArchived = projectData?.project?.isArchived;

  const canAddMember = !isArchived && can({ globalRole: user?.globalRole, projectRole: currentUserRole }, 'member:add');
  const canRemoveMember = !isArchived && can({ globalRole: user?.globalRole, projectRole: currentUserRole }, 'member:remove');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('TEAM_MEMBER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const members = membersData?.members || [];

  const handleOpenAddModal = async () => {
    try {
      const usersRes = await userApi.list({ limit: 100, isActive: true });
      const currentMemberUserIds = members.map((m: any) => m.userId);
      const candidates = usersRes.data.filter((u: any) => !currentMemberUserIds.includes(u.id));
      setAvailableUsers(candidates);
      if (candidates.length > 0) setSelectedUserId(candidates[0].id);
      setIsModalOpen(true);
    } catch (err: any) {
      alert('Failed to load user candidates.');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      await memberApi.add(projectId, { userId: selectedUserId, role: selectedRole });
      queryClient.invalidateQueries({ queryKey: queryKeys.members.list(projectId) });
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await memberApi.updateRole(projectId, memberId, newRole);
      queryClient.invalidateQueries({ queryKey: queryKeys.members.list(projectId) });
    } catch (err: any) {
      alert(err.message || 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the project?')) return;
    try {
      await memberApi.remove(projectId, memberId);
      queryClient.invalidateQueries({ queryKey: queryKeys.members.list(projectId) });
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-fg tracking-tight flex items-center space-x-2">
            <Users className="h-5 w-5 text-plum" />
            <span>Project Team Roster</span>
          </h2>
          <p className="text-xs text-fg-muted mt-0.5">
            Manage member access levels and project permissions.
          </p>
        </div>

        {canAddMember && (
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition-all"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Member</span>
          </button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface h-16 rounded-2xl animate-pulse border border-line" />
          ))}
        </div>
      )}

      {isError && (
        <div className="bg-surface p-6 rounded-2xl border border-danger/25 text-center space-y-3 max-w-md mx-auto shadow-sm">
          <AlertTriangle className="h-8 w-8 text-danger mx-auto" />
          <p className="text-xs text-fg-muted">Failed to load team members.</p>
          <button onClick={() => refetch()} className="px-3 py-1.5 rounded-lg bg-surface-2 text-xs text-fg hover:bg-line">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="bg-surface rounded-2xl border border-line shadow-sm divide-y divide-line">
          {members.map((m: any) => (
            <div key={m.id} className="p-4 flex items-center justify-between hover:bg-surface-2 transition-colors">
              <div className="flex items-center space-x-3">
                <div
                  className={`h-9 w-9 rounded-full border flex items-center justify-center font-bold text-xs ${getAvatarColor(
                    m.user.id
                  )}`}
                >
                  {getInitials(m.user.name)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-fg">{m.user.name}</p>
                  <p className="text-xs text-fg-muted">{m.user.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {canAddMember ? (
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.id, e.target.value)}
                    className="bg-surface-2 border border-line rounded-lg px-2.5 py-1 text-xs text-fg font-medium focus:outline-none"
                  >
                    <option value="PROJECT_MANAGER">PROJECT_MANAGER</option>
                    <option value="TEAM_MEMBER">TEAM_MEMBER</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                ) : (
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-surface-2 text-fg-muted border border-line">
                    {m.role}
                  </span>
                )}

                {canRemoveMember && m.userId !== user?.id && (
                  <button
                    onClick={() => handleRemoveMember(m.id)}
                    className="p-1.5 rounded-lg text-fg-subtle hover:text-danger hover:bg-danger/10 transition-colors"
                    title="Remove Member"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD MEMBER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface p-6 rounded-2xl border border-line shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-lg font-bold text-fg">Add Member to Project</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-fg-subtle hover:text-fg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-danger/10 border border-danger/25 text-danger text-xs">
                {formError}
              </div>
            )}

            {availableUsers.length === 0 ? (
              <p className="text-xs text-fg-muted text-center py-4">
                All active system users are already members of this project.
              </p>
            ) : (
              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">
                    Select User
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2.5 text-xs text-fg focus:outline-none"
                  >
                    {availableUsers.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">
                    Project Role
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2.5 text-xs text-fg focus:outline-none"
                  >
                    <option value="TEAM_MEMBER">TEAM_MEMBER (Can edit assigned tasks & comment)</option>
                    <option value="PROJECT_MANAGER">PROJECT_MANAGER (Full project management)</option>
                    <option value="VIEWER">VIEWER (Read-only access)</option>
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
                    {isSubmitting ? 'Adding...' : 'Add Member'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
