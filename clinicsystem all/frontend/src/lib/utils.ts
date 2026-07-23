import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date, format: 'short' | 'long' | 'time' = 'short'): string {
  const d = new Date(date)
  if (format === 'long')
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  if (format === 'time')
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function getAgeFromDOB(dob: string): number {
  if (!dob) return 0
  const today = new Date()
  const birth = new Date(dob)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    Scheduled: 'badge-blue',
    Confirmed: 'badge-teal',
    'Checked-In': 'badge-yellow',
    'In Progress': 'badge-yellow',
    Completed: 'badge-green',
    Cancelled: 'badge-red',
    'No Show': 'badge-gray',
    Active: 'badge-green',
    Expired: 'badge-red',
    Suspended: 'badge-red',
    Trial: 'badge-teal',
    Paid: 'badge-green',
    Unpaid: 'badge-red',
    Partial: 'badge-yellow',
    Requested: 'badge-blue',
    'Sample Collected': 'badge-yellow',
    Routine: 'badge-gray',
    Urgent: 'badge-yellow',
    STAT: 'badge-red',
  }
  return map[status] || 'badge-gray'
}

export function truncate(str: string, length = 40): string {
  return str.length > length ? `${str.slice(0, length)}…` : str
}
