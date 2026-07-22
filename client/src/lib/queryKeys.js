// Central registry of React Query keys so invalidations stay consistent.
export const queryKeys = {
  me: ['auth', 'me'],
  companies: (params) => ['companies', 'list', params ?? {}],
  expenseHeads: (params) => ['expenseHeads', 'list', params ?? {}],
  entries: (params) => ['entries', 'list', params ?? {}],
  monthwiseReport: (params) => ['reports', 'monthwise', params ?? {}],
  expenseHeadReport: (params) => ['reports', 'expenseHeads', params ?? {}],
  companyReport: (params) => ['reports', 'companies', params ?? {}],
  dashboardStats: (params) => ['dashboard', 'stats', params ?? {}],
  expenseByCompany: (params) => ['dashboard', 'expenseByCompany', params ?? {}],
  expenseByExpenseHead: (params) => ['dashboard', 'expenseByExpenseHead', params ?? {}],
  expenseByMonth: (params) => ['dashboard', 'expenseByMonth', params ?? {}],
  topExpenseHeads: (params) => ['dashboard', 'topExpenseHeads', params ?? {}],
  users: ['masters', 'users'],
};
