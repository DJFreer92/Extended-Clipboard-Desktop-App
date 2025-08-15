// Date & time formatting utilities
export function toDate(d: Date | number | string): Date {
  return d instanceof Date ? d : new Date(d);
}

export function dateKey(d: Date): string {
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()].join('-');
}

export function formatTimeAMPM(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function formatRelative(d: Date): string {
  const now = new Date();
  const ms = now.getTime() - d.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  if (years >= 1) return `${years} ${years === 1 ? 'year' : 'years'} ago`;
  if (months >= 12) return '1 year ago';
  if (months >= 1) return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  if (weeks >= 1) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}

export function formatFullDate(d: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}
