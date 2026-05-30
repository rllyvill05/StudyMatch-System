import api from './axiosInstance';

export const getProfile = async () => {
  try {
    const response = await api.get('/profile');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    throw error;
  }
};

export const updateProfile = async (profileData) => {
  try {
    const response = await api.put('/profile', profileData);
    return response.data;
  } catch (error) {
    console.error('Failed to update profile:', error);
    throw error;
  }
};

// Profile Setup Steps (ADD THESE)
export const updateProfileStep1 = async (data) => {
  try {
    const response = await api.put('/profile/step-1', data);
    return response.data;
  } catch (error) {
    console.error('Failed to update profile step 1:', error);
    throw error;
  }
};

export const updateProfileStep2 = async (data) => {
  try {
    const response = await api.put('/profile/step-2', data);
    return response.data;
  } catch (error) {
    console.error('Failed to update profile step 2:', error);
    throw error;
  }
};

export const updateProfileStep3 = async (data) => {
  try {
    const response = await api.put('/profile/step-3', data);
    return response.data;
  } catch (error) {
    console.error('Failed to update profile step 3:', error);
    throw error;
  }
};

export const updateProfileStep4 = async (data) => {
  try {
    const response = await api.put('/profile/step-4', data);
    return response.data;
  } catch (error) {
    console.error('Failed to update profile step 4:', error);
    throw error;
  }
};

export const updatePassword = async (passwordData) => {
  try {
    const response = await api.put('/profile/password', passwordData);
    return response.data;
  } catch (error) {
    console.error('Failed to update password:', error);
    throw error;
  }
};

export const completeProfile = async (data = {}) => {
  try {
    const response = await api.post('/profile/complete', data);
    return response.data;
  } catch (error) {
    console.error('Failed to complete profile:', error);
    throw error;
  }
};

export const uploadAvatar = async (file) => {
  const form = new FormData()
  form.append('avatar', file)
  const token = localStorage.getItem('user_token')

  const res = await fetch('http://127.0.0.1:8000/api/profile/avatar', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      // No Content-Type — browser sets multipart/form-data with boundary automatically
    },
    body: form,
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Upload failed')
  return data
}

export const addTutorSubject = async (subjectId, expertiseLevel = 'proficient') => {
  const response = await api.post('/profile/subjects', { subject_id: subjectId, expertise_level: expertiseLevel });
  return response.data;
};

export const removeTutorSubject = async (tutorSubjectId) => {
  const response = await api.delete(`/profile/subjects/${tutorSubjectId}`);
  return response.data;
};

export const deleteAccount = async (password) => {
  try {
    const response = await api.delete('/profile/delete-account', { data: { password } });
    return response.data;
  } catch (error) {
    console.error('Failed to delete account:', error);
    throw error;
  }
};