import { apiClient, unwrap } from './client.js';

export async function getProfile() {
  const payload = await apiClient.get('/api/profile');
  return unwrap(payload, 'profile');
}

export async function updateProfile(profile) {
  const payload = await apiClient.put('/api/profile', profile);
  return unwrap(payload);
}
