import api from './axiosInstance';

export const getMyTickets = () => api.get('/help-center');

export const submitTicket = (subject, category, description, priority) =>
  api.post('/help-center/submit', { subject, category, description, priority });
