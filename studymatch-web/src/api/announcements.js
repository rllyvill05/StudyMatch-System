import api from './axiosInstance';

export const getAnnouncements = async () => {
  const response = await api.get('/announcements');
  return response.data;
};

// Admin-only endpoints
export const adminGetAnnouncements = async (params = {}) => {
  const response = await api.get('/admin/announcements', { params });
  return response.data;
};

export const adminCreateAnnouncement = async (data) => {
  const response = await api.post('/admin/announcements', data);
  return response.data;
};

export const adminUpdateAnnouncement = async (id, data) => {
  const response = await api.put(`/admin/announcements/${id}`, data);
  return response.data;
};

export const adminDeleteAnnouncement = async (id) => {
  const response = await api.delete(`/admin/announcements/${id}`);
  return response.data;
};