import api from './axios';

export const dashboardApi = {
  stats: (params) => api.get('/dashboard/stats', { params }),
  expenseByCompany: (params) => api.get('/dashboard/expense-by-company', { params }),
  expenseByExpenseHead: (params) => api.get('/dashboard/expense-by-expense-head', { params }),
  expenseByMonth: (params) => api.get('/dashboard/expense-by-month', { params }),
  topExpenseHeads: (params) => api.get('/dashboard/top-expense-heads', { params }),
};
