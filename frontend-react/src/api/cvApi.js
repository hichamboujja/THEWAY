import { apiClient, uploadForm, unwrap } from './client.js';

export async function uploadCV(file) {
  const form = new FormData();
  form.append('file', file);
  const payload = await uploadForm('/api/cv', form);
  return unwrap(payload);
}

export async function getCurrentCV() {
  const payload = await apiClient.get('/api/cv/current');
  return unwrap(payload);
}

export async function analyseCV(id) {
  const payload = await apiClient.post(`/api/cv/${id}/analyse`);
  return unwrap(payload);
}
