// Central registry of React Query keys so invalidations stay consistent.
export const queryKeys = {
  me: ['auth', 'me'],
  companies: (params) => ['companies', 'list', params ?? {}],
  companyStamp: (id) => ['companies', 'stamp', id],
  lookups: ['masters', 'lookups'],
  users: ['masters', 'users'],
};
