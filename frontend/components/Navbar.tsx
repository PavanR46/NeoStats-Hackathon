'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/components/SocketProvider';
import { getInitials, getAvatarColor } from '@/lib/styles';
import { Bell, LogOut, Shield } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();

  if (!user) return null;

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-purple-100 text-purple-700 border-purple-200',
    PROJECT_MANAGER: 'bg-blue-100 text-blue-700 border-blue-200',
    TEAM_MEMBER: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    VIEWER: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <header className="sticky top-0 z-40 h-16 w-full glass-panel border-b border-slate-200/80 px-6 flex items-center justify-between bg-white/90">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard" className="flex items-center space-x-3 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 bg-clip-text text-transparent">
            NeoStats
          </span>
        </Link>

        {/* Real-time Connection Indicator */}
        <div
          className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
            isConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span>{isConnected ? 'Live' : 'Reconnecting...'}</span>
        </div>
      </div>

      <div className="flex items-center space-x-5">
        {/* Notification Bell */}
        <Link
          href="/notifications"
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="View notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-brand-500 animate-ping" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-brand-500" />
        </Link>

        {/* Role Badge */}
        <div
          className={`px-3 py-1 text-xs font-semibold rounded-full border ${
            roleColors[user.globalRole] || roleColors.VIEWER
          }`}
        >
          {user.globalRole}
        </div>

        {/* User Profile Avatar & Info */}
        <div className="flex items-center space-x-3 border-l border-slate-200 pl-4">
          <div className="flex items-center space-x-2">
            <div
              className={`h-8 w-8 rounded-full border flex items-center justify-center font-semibold text-xs ${getAvatarColor(
                user.id
              )}`}
            >
              {getInitials(user.name)}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-slate-800 leading-none">{user.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            aria-label="Log out of application"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
