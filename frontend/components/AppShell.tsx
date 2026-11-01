'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { SocketProvider } from '@/components/SocketProvider';
import { Navbar } from '@/components/Navbar';

// These pages bring their own full-bleed layout, so they get no app navbar
const BARE_ROUTES = ['/', '/login'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <p className="mt-4 text-sm font-medium text-fg-muted">Loading your workspace...</p>
      </div>
    );
  }

  if (!user || (pathname && BARE_ROUTES.includes(pathname))) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <SocketProvider user={user}>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-28 md:px-6">{children}</main>
    </SocketProvider>
  );
}