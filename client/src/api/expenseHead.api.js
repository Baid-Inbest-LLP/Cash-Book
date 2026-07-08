import api from './axios';

export const expenseHeadsApi = {
  getAll: (params) => api.get('/expense-heads', { params }),
  create: (data) => api.post('/expense-heads', data),
  update: (id, data) => api.put(`/expense-heads/${id}`, data),
  delete: (id) => api.delete(`/expense-heads/${id}`),
};
