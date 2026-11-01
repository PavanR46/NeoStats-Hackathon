import React from 'react';
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';

export function SkeletonRows({ count = 4, height = 'h-16' }: { count?: number; height?: string }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`card animate-pulse ${height}`} />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card space-y-3 p-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-fg-subtle">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      {description && <p className="mx-auto max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="card mx-auto max-w-md space-y-3 border-danger/30 p-6 text-center" role="alert">
      <AlertTriangle className="mx-auto h-8 w-8 text-danger" />
      <p className="text-sm text-fg-muted">{message || 'Something went wrong while loading this page.'}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost">
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      )}
    </div>
  );
}