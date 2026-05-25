import api from './axiosInstance';

export const getSubjects = async () => {
  const response = await api.get('/subjects');
  return response.data;
};

export const getWeakSubjects = async () => {
  const response = await api.get('/weak-subjects');
  return response.data;
};

export const syncWeakSubjectsByNames = async (subjectNames, allSubjects) => {
  const names = (subjectNames || []).map(n => n.trim()).filter(Boolean);
  const subjects = subjectsPayload(names, allSubjects);
  const response = await api.put('/profile/step-3', { subjects });
  return response.data;
};

function subjectsPayload(names, allSubjects) {
  const list = Array.isArray(allSubjects) ? allSubjects : [];
  return names
    .map(name => {
      const match = list.find(
        s => (s.name || '').toLowerCase() === name.toLowerCase()
          || (s.name || '').toLowerCase().includes(name.toLowerCase()),
      );
      if (!match) return null
      return { subject_id: match.id, difficulty_level: 'moderate' }
    })
    .filter(Boolean)
}
