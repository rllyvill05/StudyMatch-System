import api from './axiosInstance';

/**
 * Get potential study partners with optional filters
 */
export const getPotentialPartners = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.subject)    params.append('subject',     filters.subject);
    if (filters.department) params.append('department',  filters.department);
    if (filters.studyStyle) params.append('study_style', filters.studyStyle);
    if (filters.search)     params.append('search',      filters.search);
    
    const queryString = params.toString();
    const url = queryString ? `/partners?${queryString}` : '/partners';
    
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch potential partners:', error);
    throw error;
  }
};

/**
 * Get a specific partner's profile
 */
export const getPartnerProfile = async (partnerId) => {
  try {
    const response = await api.get(`/partners/${partnerId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch partner profile:', error);
    throw error;
  }
};

// Legacy aliases for backward compatibility
export const getPartners = getPotentialPartners;
export const getPartner = getPartnerProfile;