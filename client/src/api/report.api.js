import api from './axios';

export const reportsApi = {
  monthwise: (params) => api.get('/reports/monthwise', { params }),
  monthwiseExportExcel: (params) =>
    api.get('/reports/monthwise/export/excel', { params, responseType: 'blob' }),
  monthwiseExportPdf: (params) =>
    api.get('/reports/monthwise/export/pdf', { params, responseType: 'blob' }),
  expenseHeads: (params) => api.get('/reports/expense-heads', { params }),
  expenseHeadsExportExcel: (params) =>
    api.get('/reports/expense-heads/export/excel', { params, responseType: 'blob' }),
  expenseHeadsExportPdf: (params) =>
    api.get('/reports/expense-heads/export/pdf', { params, responseType: 'blob' }),
  companies: (params) => api.get('/reports/companies', { params }),
  companiesExportExcel: (params) =>
    api.get('/reports/companies/export/excel', { params, responseType: 'blob' }),
  companiesExportPdf: (params) =>
    api.get('/reports/companies/export/pdf', { params, responseType: 'blob' }),
};
