import { apiClient, unwrap } from './client.js';

export async function listNotifications(params = { limit: 20 }) {
  const payload = await apiClient.get('/api/notifications', { params });
  return unwrap(payload);
}

export async function markNotificationRead(id, lu = true) {
  const payload = await apiClient.put(`/api/notifications/${id}`, { lu });
  return unwrap(payload);
}
