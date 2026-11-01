export const statusStyles: Record<string, { label: string; badge: string; dot: string }> = {
  TODO: {
    label: 'To Do',
    badge: 'bg-surface-2 text-fg-muted border-line',
    dot: 'bg-fg-subtle',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    badge: 'bg-info/10 text-info border-info/25',
    dot: 'bg-info',
  },
  IN_REVIEW: {
    label: 'In Review',
    badge: 'bg-warning/10 text-warning border-warning/25',
    dot: 'bg-warning',
  },
  DONE: {
    label: 'Done',
    badge: 'bg-success/10 text-success border-success/25',
    dot: 'bg-success',
  },
};

export const priorityStyles: Record<string, { label: string; badge: string }> = {
  LOW: {
    label: 'Low',
    badge: 'bg-surface-2 text-fg-muted border-line',
  },
  MEDIUM: {
    label: 'Medium',
    badge: 'bg-info/10 text-info border-info/25',
  },
  HIGH: {
    label: 'High',
    badge: 'bg-caution/10 text-caution border-caution/25',
  },
  URGENT: {
    label: 'Urgent',
    badge: 'bg-danger/10 text-danger border-danger/25 font-semibold',
  },
};

export function getInitials(name?: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getAvatarColor(id?: string): string {
  if (!id) return 'bg-surface-2 text-fg-muted border-line';
  const colors = [
    'bg-plum/15 text-plum border-plum/25',
    'bg-plum/15 text-plum border-plum/25',
    'bg-info/15 text-info border-info/25',
    'bg-success/15 text-success border-success/25',
    'bg-warning/15 text-warning border-warning/25',
    'bg-danger/15 text-danger border-danger/25',
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
