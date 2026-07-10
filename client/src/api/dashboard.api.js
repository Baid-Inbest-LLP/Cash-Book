import api from './axios';

export const dashboardApi = {
  expenseByCompany: (params) => api.get('/dashboard/expense-by-company', { params }),
  expenseByExpenseHead: (params) => api.get('/dashboard/expense-by-expense-head', { params }),
  expenseByMonth: (params) => api.get('/dashboard/expense-by-month', { params }),
};
