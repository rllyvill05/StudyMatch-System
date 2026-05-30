import api from './axiosInstance'

// ── Subjects catalog ────────────────────────────────────────────────
export const getSubjects    = ()         => api.get('/admin/subjects')
export const createSubject  = (data)     => api.post('/admin/subjects', data)
export const updateSubject  = (id, data) => api.put(`/admin/subjects/${id}`, data)
export const deleteSubject  = (id)       => api.delete(`/admin/subjects/${id}`)

// ── All tutors ──────────────────────────────────────────────────────
export const getAllTutors = (params) => api.get('/admin/tutors', { params })

// ── Tutor subject assignment ────────────────────────────────────────
export const getTutorSubjects      = (tutorId)                    => api.get(`/admin/tutors/${tutorId}/subjects`)
export const assignSubject         = (tutorId, data)              => api.post(`/admin/tutors/${tutorId}/subjects`, data)
export const updateTutorSubject    = (tutorId, subjectId, data)   => api.put(`/admin/tutors/${tutorId}/subjects/${subjectId}`, data)
export const removeTutorSubject    = (tutorId, subjectId)         => api.delete(`/admin/tutors/${tutorId}/subjects/${subjectId}`)
