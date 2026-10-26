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
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
          <UserCircle className="h-6 w-6 text-brand-600" />
          <span>User Profile</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Your active authenticated account details and global system permissions.
        </p>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center space-x-5 border-b border-slate-100 pb-6">
          <div
            className={`h-16 w-16 rounded-2xl border flex items-center justify-center font-bold text-xl shadow-sm ${getAvatarColor(
              user.id
            )}`}
          >
            {getInitials(user.name)}
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
            <p className="text-xs text-slate-500 flex items-center space-x-1.5">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              <span>{user.email}</span>
            </p>
            <div className="flex items-center space-x-2 pt-1">
              <span className="px-2.5 py-0.5 text-xs font-semibold uppercase rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                {user.globalRole}
              </span>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span>Account Active</span>
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <p className="font-semibold text-slate-500 uppercase tracking-wider">User ID</p>
            <p className="font-mono text-slate-800 select-all">{user.id}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <p className="font-semibold text-slate-500 uppercase tracking-wider">Authentication Strategy</p>
            <p className="text-slate-800 flex items-center space-x-1.5 font-medium">
              <Shield className="h-4 w-4 text-brand-600" />
              <span>JWT in HTTP-Only Cookie</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
