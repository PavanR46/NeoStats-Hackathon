'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, LogOut, Menu, Moon, Sun, UserCircle, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useSocket } from '@/components/SocketProvider';
import { useNotifications } from '@/hooks/useNotifications';
import { getAvatarColor, getInitials } from '@/lib/styles';

export function Navbar() {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const { data } = useNotifications();

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the user menu when clicking anywhere else
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // Close menus after navigating
  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  if (!user) return null;

  const links = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Projects', href: '/projects' },
    { label: 'Escalations', href: '/escalations' },
    { label: 'Performance', href: '/performance' },
    { label: 'PM Portal', href: '/pm' },
    ...(user.globalRole === 'ADMIN' ? [{ label: 'Admin', href: '/admin' }] : []),
  ];

  const isActive = (href: string) => pathname === href || !!pathname?.startsWith(`${href}/`);
  const unread = data?.unreadCount ?? 0;

  return (
    <header className="fixed inset-x-0 top-4 z-50 px-4">
      <div className="relative mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl border border-line bg-surface/70 px-3 backdrop-blur-xl">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2.5 pl-1" aria-label="KPM home">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-fg text-sm font-bold text-canvas">K</span>
          <span className="font-semibold tracking-tight text-fg">KPM</span>
        </Link>

        {/* Primary navigation (desktop) */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? 'page' : undefined}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                isActive(link.href)
                  ? 'bg-surface-2 font-medium text-fg'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <span
            className="hidden items-center gap-1.5 text-xs text-fg-subtle xl:inline-flex"
            title={isConnected ? 'Real-time connection active' : 'Trying to reconnect'}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'animate-pulse bg-success' : 'bg-warning'}`} />
            {isConnected ? 'Live' : 'Reconnecting'}
          </span>

          <Link
            href="/notifications"
            aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
            className="relative grid h-9 w-9 place-items-center rounded-full text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-canvas">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>

          {/* Theme switch */}
          <button
            onClick={toggle}
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label="Dark mode"
            className="relative h-7 w-12 rounded-full border border-line bg-surface-2"
          >
            <span
              className={`absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-fg text-canvas transition-transform ${
                theme === 'dark' ? 'translate-x-0' : 'translate-x-5'
              }`}
            >
              {theme === 'dark' ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
            </span>
          </button>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 transition-colors hover:bg-surface-2"
            >
              <span
                className={`grid h-7 w-7 place-items-center rounded-full border text-[11px] font-semibold ${getAvatarColor(user.id)}`}
              >
                {getInitials(user.name)}
              </span>
              <span className="hidden max-w-[7rem] truncate text-sm text-fg sm:block">{user.name}</span>
            </button>

            {menuOpen && (
              <div role="menu" className="card absolute right-0 mt-2 w-64 p-2 shadow-xl">
                <div className="border-b border-line px-3 py-2">
                  <p className="truncate text-sm font-medium text-fg">{user.name}</p>
                  <p className="truncate text-xs text-fg-subtle">{user.email}</p>
                  <span className="pill mt-2">{user.globalRole === 'ADMIN' ? 'Administrator' : 'Team member'}</span>
                </div>
                <Link
                  href="/profile"
                  role="menuitem"
                  className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-surface-2 hover:text-fg"
                >
                  <UserCircle className="h-4 w-4" />
                  Profile
                </Link>
                <button
                  onClick={() => logout()}
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            className="grid h-9 w-9 place-items-center rounded-full text-fg-muted hover:bg-surface-2 lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile navigation panel */}
        {mobileOpen && (
          <nav className="card absolute inset-x-0 top-16 p-2 shadow-xl lg:hidden" aria-label="Mobile">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-lg px-3 py-2.5 text-sm ${
                  isActive(link.href) ? 'bg-surface-2 font-medium text-fg' : 'text-fg-muted hover:bg-surface-2'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}