import { apiClient, unwrap } from './client.js';

export async function listOpportunities(params = {}) {
  const payload = await apiClient.get('/api/opportunities', { params });
  return unwrap(payload);
}

export async function getOpportunity(id) {
  const payload = await apiClient.get(`/api/opportunities/${id}`);
  return unwrap(payload, 'opportunity');
}

export async function bookmarkOpportunity(id) {
  const payload = await apiClient.post(`/api/opportunities/${id}/bookmark`);
  return unwrap(payload);
}

export async function removeBookmark(id) {
  const payload = await apiClient.delete(`/api/opportunities/${id}/bookmark`);
  return unwrap(payload);
}

export async function applyToOpportunity(id, body = {}) {
  const payload = await apiClient.post(`/api/opportunities/${id}/applications`, body);
  return unwrap(payload);
}
