import { apiClient, unwrap } from './client.js';

export async function listSkills() {
  const payload = await apiClient.get('/api/skills');
  return unwrap(payload, 'skills') || [];
}

export async function createSkill(skill) {
  const payload = await apiClient.post('/api/skills', skill);
  return unwrap(payload, 'skill');
}

export async function updateSkill(id, skill) {
  const payload = await apiClient.put(`/api/skills/${id}`, skill);
  return unwrap(payload);
}

export async function deleteSkill(id) {
  const payload = await apiClient.delete(`/api/skills/${id}`);
  return unwrap(payload);
}
