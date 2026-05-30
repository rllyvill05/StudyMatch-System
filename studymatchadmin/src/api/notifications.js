import api from './axiosInstance'

export const getNotifications  = (params = {}) => api.get('/admin/notifications', { params })
export const getUnreadCount    = ()             => api.get('/admin/notifications/unread-count')
export const markRead          = (id)           => api.put(`/admin/notifications/${id}/read`)
export const markAllRead       = ()             => api.put('/admin/notifications/mark-all-read')
