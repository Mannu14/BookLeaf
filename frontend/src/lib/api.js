import axios from 'axios';

export const TOKEN_KEY = 'bookleaf.token';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalise every failure into an Error with the API's message and field
// details, so components never have to dig through axios internals.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const payload = err.response?.data?.error;
    const error = new Error(
      payload?.message || (err.code === 'ECONNABORTED' ? 'The request timed out.' : 'Could not reach the server.')
    );
    error.status = err.response?.status;
    error.details = payload?.details || [];

    if (error.status === 401 && !err.config?.url?.includes('/auth/login')) {
      window.dispatchEvent(new Event('bookleaf:unauthorized'));
    }
    return Promise.reject(error);
  }
);

// Map validation details to { field: message } for inline form errors.
export const fieldErrors = (error) =>
  Object.fromEntries((error?.details || []).map((d) => [d.field, d.message]));
