'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, FolderKanban, ShieldCheck, Briefcase, Bell, UserCircle } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Projects', href: '/projects', icon: FolderKanban },
    { label: 'PM Portal', href: '/pm', icon: Briefcase },
    ...(user.globalRole === 'ADMIN' ? [{ label: 'Admin Portal', href: '/admin', icon: ShieldCheck }] : []),
    { label: 'Notifications', href: '/notifications', icon: Bell },
    { label: 'Profile', href: '/profile', icon: UserCircle },
  ];

  return (
    <aside className="w-64 glass-panel border-r border-slate-200 bg-white/80 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between hidden md:flex">
      <div className="space-y-1">
        <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Platform Navigation
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-700 border border-brand-200/80 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="glass-card p-3 rounded-xl border border-slate-200 text-xs text-slate-500 bg-slate-50/60">
        <p className="font-semibold text-slate-800">NeoStats Hackathon v1.0</p>
        <p className="mt-1 text-slate-500">Real-time Role-Based PM Platform</p>
      </div>
    </aside>
  );
}
