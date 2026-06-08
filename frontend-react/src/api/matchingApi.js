import { apiClient, unwrap } from './client.js';

export async function runMatching(body = {}) {
  const payload = await apiClient.post('/api/matching/run', body);
  return unwrap(payload);
}

export async function listMatching(params = {}) {
  const payload = await apiClient.get('/api/matching', { params });
  return unwrap(payload);
}
