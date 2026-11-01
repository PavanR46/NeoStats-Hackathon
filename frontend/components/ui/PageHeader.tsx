import React from 'react';

interface PageHeaderProps {
  title: string;
  accent?: string; // rendered in the serif italic style, e.g. title="Performance" accent="Matrix"
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, accent, description, icon, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-fg md:text-4xl">
          {icon}
          <span>
            {title}
            {accent && (
              <>
                {' '}
                <em className="accent-serif">{accent}</em>
              </>
            )}
          </span>
        </h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}