'use client';

import React from 'react';
import Link from 'next/link';
import { useNotifications } from '@/hooks/useNotifications';
import { notificationApi } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Bell, CheckCheck, Check, AlertTriangle, RefreshCw } from 'lucide-react';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useNotifications();

  const notifications = data?.data || [];
  const unreadCount = data?.unreadCount || 0;

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    } catch (err: any) {
      alert(err.message || 'Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    } catch (err: any) {
      alert(err.message || 'Failed to mark all as read');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Bell className="h-6 w-6 text-brand-600" />
            <span>Notifications</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time updates on assignments, status changes, mentions, and project membership.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-brand-700 transition-colors"
          >
            <CheckCheck className="h-4 w-4" />
            <span>Mark All as Read ({unreadCount})</span>
          </button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white h-20 rounded-2xl animate-pulse border border-slate-200" />
          ))}
        </div>
      )}

      {isError && (
        <div className="bg-white p-6 rounded-2xl border border-rose-200 text-center space-y-3 max-w-md mx-auto shadow-sm">
          <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
          <p className="text-xs text-slate-700">Failed to load notifications.</p>
          <button onClick={() => refetch()} className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs text-slate-800 hover:bg-slate-200">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {!isLoading && !isError && notifications.length === 0 && (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center space-y-3">
          <Bell className="h-10 w-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800">No Notifications</h3>
          <p className="text-xs text-slate-400">You are completely caught up!</p>
        </div>
      )}

      {!isLoading && !isError && notifications.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {notifications.map((n: any) => (
            <div
              key={n.id}
              className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                !n.isRead ? 'bg-brand-50/60' : 'hover:bg-slate-50'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-sm text-slate-900">{n.title}</span>
                  {!n.isRead && (
                    <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
                  )}
                </div>
                <p className="text-xs text-slate-600">{n.message}</p>
                <div className="flex items-center space-x-3 pt-1 text-[11px] text-slate-400">
                  <span>{new Date(n.createdAt).toLocaleString()}</span>
                  {n.link && (
                    <>
                      <span>•</span>
                      <Link href={n.link} className="text-brand-600 hover:text-brand-700 font-medium">
                        View Item
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {!n.isRead && (
                <button
                  onClick={() => handleMarkAsRead(n.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                  title="Mark as Read"
                >
                  <Check className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
