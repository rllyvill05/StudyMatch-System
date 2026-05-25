import api from './axiosInstance';

export const getSessions = async (status = null) => {
  const params = status ? { status } : {}
  const response = await api.get('/sessions', { params })
  return response.data
}

export const getSession = async (id) => {
  const response = await api.get(`/sessions/${id}`)
  return response.data
}

export const createSession = async (data) => {
  const response = await api.post('/sessions', data)
  return response.data
}

export const updateSession = async (id, data) => {
  const response = await api.put(`/sessions/${id}`, data)
  return response.data
}

export const cancelSession = async (id) => {
  const response = await api.delete(`/sessions/${id}`)
  return response.data
}
