export const DEFAULT_PAGE_SIZE = Number(import.meta.env.VITE_PAGE_SIZE) || 10;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'cashbook_access_token',
  REFRESH_TOKEN: 'cashbook_refresh_token',
  USER: 'cashbook_user',
  THEME: 'cashbook_theme',
};

export const ROUTES = {
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  HOME: '/',
  CONTROL_CENTER: '/control-center',
  CONTROL_CENTER_COMPANIES: '/control-center/companies',
  CONTROL_CENTER_EXPENSE_HEADS: '/control-center/expense-heads',
  ENTRIES: '/entries',
  EXCLUDED_ENTRIES: '/excluded-entries',
  REPORTS_MONTHWISE: '/reports/monthwise',
  REPORTS_EXPENSE_HEADS: '/reports/expense-heads',
  REPORTS_COMPANIES: '/reports/companies',
  SETTINGS: '/settings',
};

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
