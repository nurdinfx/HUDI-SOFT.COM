// ─── App Constants ───────────────────────────────────────────────────────────

export const API_BASE_URL = 'https://hudi-soft-com-online-pos.onrender.com/api/v1';
export const SOCKET_URL   = 'https://hudi-soft-com-online-pos.onrender.com';

export const STORAGE_KEYS = {
  AUTH_TOKEN:      'auth_token',
  USER_DATA:       'user_data',
  LICENSE_KEY:     'license_key',
  LICENSE_DATA:    'license_data',
  DEVICE_ID:       'device_id',
  LAST_SYNC:       'last_sync_at',
  DEFAULT_PRINTER: 'default_printer',
  PAPER_SIZE:      'paper_size',
  CART_DATA:       'cart_data',
} as const;

// ─── Color palette matching the web POS (light theme, #2563eb primary) ───────
export const COLORS = {
  primary:     '#2563eb',   // same as --color-primary in web index.css
  primaryDark: '#1d4ed8',   // same as --color-primary-600
  secondary:   '#64748b',   // same as --color-secondary
  success:     '#16a34a',   // same as --color-success
  warning:     '#f59e0b',
  danger:      '#dc2626',   // same as --color-error
  dark:        '#0f172a',
  card:        '#ffffff',
  cardBorder:  '#e2e8f0',   // same as --color-border
  text:        '#0f172a',   // same as body color
  textMuted:   '#94a3b8',   // same as --color-muted
  background:  '#f8fafc',   // same as --color-bg
  surface:     '#ffffff',   // same as --color-surface
  white:       '#ffffff',
  accent:      '#2563eb',
} as const;

export const PAPER_SIZES = {
  '58mm': { width: 384, chars: 32 },
  '80mm': { width: 576, chars: 48 },
} as const;

export const PAYMENT_METHODS = [
  { id: 'cash',         label: 'Cash',         icon: 'cash'            },
  { id: 'card',         label: 'Card',          icon: 'card-outline'    },
  { id: 'mobile_money', label: 'Mobile Money',  icon: 'phone-portrait'  },
  { id: 'split',        label: 'Split Payment', icon: 'git-branch'      },
] as const;

export const SYNC_INTERVAL_MS = 30_000; // 30 seconds
export const OFFLINE_QUEUE_KEY = 'offline_queue';
