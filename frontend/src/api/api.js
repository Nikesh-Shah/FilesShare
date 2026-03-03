import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
          if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.code === 'NETWORK_ERROR' || !error.response) {
            error.message = 'Network error. Please check your internet connection and try again.';
        } else if (error.response?.status >= 500) {
            error.message = 'Server error. Please try again later.';
        } else if (error.response?.status === 404) {
            error.message = error.response?.data?.message || 'Resource not found.';
        }
        return Promise.reject(error);
    }
);

export const login= (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);

// File share APIs
export const createFileShare = (data) => api.post('/fileshare/create', data);
export const getFileShares = (senderEmail = null) => {
    const params = senderEmail ? { senderEmail } : {};
    return api.get('/fileshare/list', { params });
};
export const updateFileShareStatus = (roomId, status) => api.put(`/fileshare/status/${roomId}`, { status });
export const toggleDownloadPermission = (roomId, downloadEnabled) => api.put(`/fileshare/download-permission/${roomId}`, { downloadEnabled });
export const checkDownloadPermission = (roomId) => api.get(`/fileshare/download-permission/${roomId}`);
export const deleteFileShare = (roomId) => api.delete(`/fileshare/delete/${roomId}`);
export const deleteAllFileShares = (senderEmail) => api.delete(`/fileshare/delete-all/${senderEmail}`);
export const getRoomByOtp = (otp) => api.get(`/fileshare/by-otp/${otp}`);

// Admin APIs
export const adminGetStats = () => api.get('/admin/stats');
export const adminGetUsers = () => api.get('/admin/users');
export const adminGetUser = (id) => api.get(`/admin/users/${id}`);
export const adminToggleUserActive = (id) => api.put(`/admin/users/${id}/toggle-active`);
export const adminDeleteUser = (id) => api.delete(`/admin/users/${id}`);