// Central registry of React Query keys so invalidations stay consistent.
export const queryKeys = {
  me: ['auth', 'me'],
  companies: (params) => ['companies', 'list', params ?? {}],
  companyStamp: (id) => ['companies', 'stamp', id],
  expenseHeads: (params) => ['expenseHeads', 'list', params ?? {}],
  entries: (params) => ['entries', 'list', params ?? {}],
  users: ['masters', 'users'],
};
