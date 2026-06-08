import { apiClient, setCsrfToken, unwrap } from './client.js';

export async function fetchSession() {
  const payload = await apiClient.get('/api/auth/session');
  const data = unwrap(payload);
  setCsrfToken(data.csrfToken);
  return data;
}

export async function login(credentials) {
  const payload = await apiClient.post('/api/auth/login', credentials);
  const data = unwrap(payload);
  setCsrfToken(data.csrfToken);
  return data;
}

export async function register(input) {
  const payload = await apiClient.post('/api/auth/register', input);
  const data = unwrap(payload);
  setCsrfToken(data.csrfToken);
  return data;
}

export async function logout() {
  const payload = await apiClient.post('/api/auth/logout');
  setCsrfToken('');
  return unwrap(payload);
}
