'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { SocketProvider } from '@/components/SocketProvider';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="h-10 w-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-slate-500 text-sm font-medium">Loading NeoStats Session...</p>
      </div>
    );
  }

  if (!user) {
    return <main className="min-h-screen bg-slate-50">{children}</main>;
  }

  return (
    <SocketProvider user={user}>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-6 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SocketProvider>
  );
}
