import axios from 'axios';

const apiBaseURL = import.meta.env.VITE_API_BASE_URL || '';

export const apiClient = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

let csrfToken = '';

export function setCsrfToken(token) {
  csrfToken = token || '';
}

apiClient.interceptors.request.use((config) => {
  if (csrfToken && !['get', 'head', 'options'].includes(String(config.method).toLowerCase())) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => normalizePayload(response.data),
  (error) => {
    const payload = error.response?.data;
    const normalized = normalizePayload(payload);
    const message = normalized?.error?.message || normalized?.error || error.message || 'Erreur API';
    return Promise.reject({
      status: error.response?.status,
      message,
      code: normalized?.error?.code || 'api_error',
      raw: payload
    });
  }
);

export function normalizePayload(payload) {
  if (!payload || typeof payload !== 'object') return { ok: true, data: payload };
  if ('data' in payload) return payload;

  const data = { ...payload };
  delete data.ok;
  delete data.error;
  delete data.requestId;

  return {
    ok: payload.ok !== false,
    data,
    error: payload.error,
    requestId: payload.requestId
  };
}

export function unwrap(payload, key) {
  const data = payload?.data ?? payload;
  if (!key) return data;
  if (data && key in data) return data[key];
  return data;
}

export async function uploadForm(path, formData) {
  const result = await apiClient.post(path, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return result;
}
