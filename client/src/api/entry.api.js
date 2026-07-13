import api from './axios';

export const entriesApi = {
  getAll: (params) => api.get('/entries', { params }),
  exportExcel: (params) => api.get('/entries/export/excel', { params, responseType: 'blob' }),
  exportPdf: (params) => api.get('/entries/export/pdf', { params, responseType: 'blob' }),
  createReceipt: (data) => api.post('/entries/receipt', data),
  createPayment: (data) => api.post('/entries/payment', data),
  update: (id, data) => api.put(`/entries/${id}`, data),
  exclude: (ids) => api.patch('/entries/exclude', { ids }),
  restore: (ids) => api.patch('/entries/restore', { ids }),
  deletePermanent: (ids) => api.delete('/entries/permanent', { data: { ids } }),
};
