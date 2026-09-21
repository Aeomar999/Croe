import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: string, currency = 'GHS'): string {
  const num = parseFloat(amount);
  if (currency === 'GHS') {
    return `GH₵${num.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (currency === 'NGN') {
    return `₦${num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (currency === 'KES') {
    return `KSh${num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${currency} ${num.toFixed(2)}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

export function getPriorityLabel(priority: number): string {
  if (priority > 1000) return 'Critical';
  if (priority > 500) return 'High';
  if (priority > 100) return 'Medium';
  return 'Standard';
}

export function getReasonCodeLabel(code: string): string {
  const labels: Record<string, string> = {
    NOT_RECEIVED: 'Item Not Received',
    WRONG_ITEM: 'Wrong Item',
    DAMAGED: 'Damaged',
    NOT_AS_DESCRIBED: 'Not As Described',
    OTHER: 'Other',
  };
  return labels[code] || code;
}

export function getDisputeStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    OPENED: 'Opened',
    AI_PROCESSING: 'AI Review',
    UNDER_HUMAN_REVIEW: 'Human Review',
    RESOLVED_AUTO: 'Auto Resolved',
    RESOLVED_HUMAN: 'Resolved',
  };
  return labels[status] || status;
}

export function getStatePillClass(state: string): string {
  const classes: Record<string, string> = {
    OPENED: 'state-caution',
    AI_PROCESSING: 'state-caution',
    UNDER_HUMAN_REVIEW: 'state-caution',
    RESOLVED_AUTO: 'state-done',
    RESOLVED_HUMAN: 'state-done',
    PENDING: 'state-pending',
    APPROVED: 'state-secure',
    REJECTED: 'state-danger',
    FROZEN: 'state-danger',
    ACTIVE: 'state-secure',
  };
  return classes[state] || 'state-pending';
}