import { apiClient, unwrap } from './client.js';

export async function getCoachTips(profile = {}) {
  const payload = await apiClient.post('/api/ai/coach', profile);
  return unwrap(payload);
}
