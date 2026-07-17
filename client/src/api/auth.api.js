import api from './axios';

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  getAvatar: () => api.get('/auth/me/avatar'),
  updateProfile: (data) => api.put('/auth/profile', data),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  register: (data) => api.post('/auth/register', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};
