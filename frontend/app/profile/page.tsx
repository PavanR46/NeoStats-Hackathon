'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { getInitials, getAvatarColor } from '@/lib/styles';
import { UserCircle, Shield, Mail, CheckCircle2 } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-fg tracking-tight flex items-center space-x-2">
          <UserCircle className="h-6 w-6 text-accent" />
          <span>User Profile</span>
        </h1>
        <p className="text-sm text-fg-muted mt-1">
          Your active authenticated account details and global system permissions.
        </p>
      </div>

      <div className="bg-surface p-8 rounded-2xl border border-line shadow-sm space-y-6">
        <div className="flex items-center space-x-5 border-b border-line pb-6">
          <div
            className={`h-16 w-16 rounded-2xl border flex items-center justify-center font-bold text-xl shadow-sm ${getAvatarColor(
              user.id
            )}`}
          >
            {getInitials(user.name)}
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-fg">{user.name}</h2>
            <p className="text-xs text-fg-muted flex items-center space-x-1.5">
              <Mail className="h-3.5 w-3.5 text-fg-subtle" />
              <span>{user.email}</span>
            </p>
            <div className="flex items-center space-x-2 pt-1">
              <span className="px-2.5 py-0.5 text-xs font-semibold uppercase rounded-full bg-plum/15 text-plum border border-plum/25">
                {user.globalRole}
              </span>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-success/10 text-success border border-success/25 flex items-center space-x-1">
                <CheckCircle2 className="h-3 w-3 text-success" />
                <span>Account Active</span>
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-surface-2 border border-line space-y-1">
            <p className="font-semibold text-fg-muted uppercase tracking-wider">User ID</p>
            <p className="font-mono text-fg select-all">{user.id}</p>
          </div>

          <div className="p-4 rounded-xl bg-surface-2 border border-line space-y-1">
            <p className="font-semibold text-fg-muted uppercase tracking-wider">Authentication Strategy</p>
            <p className="text-fg flex items-center space-x-1.5 font-medium">
              <Shield className="h-4 w-4 text-accent" />
              <span>JWT in HTTP-Only Cookie</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
