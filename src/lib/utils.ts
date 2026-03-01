import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number | string, currency = 'USD'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

export function formatCurrencyDetailed(amount: number | string, currency = 'USD'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
}

export function formatPercent(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0%';
  return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateShort(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-red-700 bg-red-50 border-red-200';
    case 'high': return 'text-orange-700 bg-orange-50 border-orange-200';
    case 'medium': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    case 'low': return 'text-blue-700 bg-blue-50 border-blue-200';
    default: return 'text-gray-700 bg-gray-50 border-gray-200';
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case 'active': case 'open': case 'connected': case 'completed': return 'text-green-700 bg-green-50 border-green-200';
    case 'warning': case 'pending': case 'pending_approval': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    case 'exceeded': case 'failed': case 'rejected': case 'critical': return 'text-red-700 bg-red-50 border-red-200';
    case 'acknowledged': case 'approved': case 'executing': return 'text-blue-700 bg-blue-50 border-blue-200';
    case 'resolved': case 'dismissed': case 'implemented': return 'text-gray-700 bg-gray-50 border-gray-200';
    default: return 'text-gray-700 bg-gray-50 border-gray-200';
  }
}

export function providerIcon(provider: string): string {
  switch (provider?.toLowerCase()) {
    case 'aws': return '🟠';
    case 'azure': return '🔵';
    case 'gcp': return '🔴';
    default: return '☁️';
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
