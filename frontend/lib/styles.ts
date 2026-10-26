export const statusStyles: Record<string, { label: string; badge: string; dot: string }> = {
  TODO: {
    label: 'To Do',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  IN_REVIEW: {
    label: 'In Review',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  DONE: {
    label: 'Done',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
};

export const priorityStyles: Record<string, { label: string; badge: string }> = {
  LOW: {
    label: 'Low',
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  MEDIUM: {
    label: 'Medium',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  HIGH: {
    label: 'High',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  URGENT: {
    label: 'Urgent',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
  },
};

export function getInitials(name?: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getAvatarColor(id?: string): string {
  if (!id) return 'bg-slate-100 text-slate-700 border-slate-200';
  const colors = [
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-purple-100 text-purple-700 border-purple-200',
    'bg-blue-100 text-blue-700 border-blue-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bg-amber-100 text-amber-700 border-amber-200',
    'bg-rose-100 text-rose-700 border-rose-200',
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
