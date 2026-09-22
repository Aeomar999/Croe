import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: string, currency = 'GHS'): string {
  const formattedAmount = formatDecimal(amount);
  if (currency === 'GHS') {
    return `GH₵${formattedAmount}`;
  }
  if (currency === 'NGN') {
    return `₦${formattedAmount}`;
  }
  if (currency === 'KES') {
    return `KSh${formattedAmount}`;
  }
  return `${currency} ${formattedAmount}`;
}

/** Formats a NUMERIC(15,2) value without coercing it to a JavaScript float. */
export function formatDecimal(value: string): string {
  const normalized = value.trim();
  const isNegative = normalized.startsWith('-');
  const unsigned = normalized.replace(/^[+-]/, '');
  const [integerPart = '0', fractionalPart = ''] = unsigned.split('.', 2);
  const whole = (integerPart.replace(/^0+(?=\d)/, '') || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fraction = `${fractionalPart}00`.slice(0, 2);

  return `${isNegative ? '-' : ''}${whole}.${fraction}`;
}

/** Compares decimal strings precisely, preserving the financial wire format. */
export function compareDecimalStrings(left: string, right: string): number {
  const parse = (value: string) => {
    const trimmed = value.trim();
    const negative = trimmed.startsWith('-');
    const [wholeRaw = '0', fractionalRaw = ''] = trimmed.replace(/^[+-]/, '').split('.', 2);
    return {
      negative,
      whole: wholeRaw.replace(/^0+(?=\d)/, '') || '0',
      fractional: fractionalRaw.replace(/\D/g, '').padEnd(2, '0').slice(0, 2),
    };
  };

  const a = parse(left);
  const b = parse(right);
  if (a.negative !== b.negative) return a.negative ? -1 : 1;

  const unsignedComparison = a.whole.length !== b.whole.length
    ? a.whole.length - b.whole.length
    : a.whole.localeCompare(b.whole) || a.fractional.localeCompare(b.fractional);

  return a.negative ? -unsignedComparison : unsignedComparison;
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
    ITEM_NOT_RECEIVED: 'Item Not Received',
    ITEM_DAMAGED: 'Item Damaged',
    WRONG_ITEM: 'Wrong Item',
    ITEM_NOT_AS_DESCRIBED: 'Item Not As Described',
  };
  return labels[code] || code;
}

export function getDisputeStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    AI_PROCESSING: 'AI Review',
    UNDER_HUMAN_REVIEW: 'Human Review',
    RESOLVED_AUTO: 'Auto Resolved',
    FRAUD_LOCKOUT: 'Restricted',
  };
  return labels[status] || status;
}

export function getStatePillClass(state: string): string {
  const classes: Record<string, string> = {
    AI_PROCESSING: 'state-caution',
    UNDER_HUMAN_REVIEW: 'state-caution',
    RESOLVED_AUTO: 'state-done',
    FRAUD_LOCKOUT: 'state-danger',
    PENDING: 'state-pending',
    APPROVED: 'state-secure',
    REJECTED: 'state-danger',
    FROZEN: 'state-danger',
    ACTIVE: 'state-secure',
  };
  return classes[state] || 'state-pending';
}
