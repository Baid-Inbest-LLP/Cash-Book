import api from './axios';

export const masterApi = {
  companies: () => api.get('/masters/companies'),
  locations: () => api.get('/masters/locations'),
  users: () => api.get('/masters/users'),
  createCompany: (data) => api.post('/masters/companies', data),
  createLocation: (data) => api.post('/masters/locations', data),
  updateUser: (id, data) => api.put(`/masters/users/${id}`, data),
  deleteUser: (id) => api.delete(`/masters/users/${id}`),
  resetUserPassword: (id) => api.post(`/masters/users/${id}/reset-password`),
};
