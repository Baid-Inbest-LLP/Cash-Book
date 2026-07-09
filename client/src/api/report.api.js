import api from './axios';

export const reportsApi = {
  monthwise: (params) => api.get('/reports/monthwise', { params }),
  monthwiseExport: (params) =>
    api.get('/reports/monthwise/export', { params, responseType: 'blob' }),
  expenseHeads: (params) => api.get('/reports/expense-heads', { params }),
  expenseHeadsExport: (params) =>
    api.get('/reports/expense-heads/export', { params, responseType: 'blob' }),
  companies: (params) => api.get('/reports/companies', { params }),
  companiesExport: (params) =>
    api.get('/reports/companies/export', { params, responseType: 'blob' }),
};
