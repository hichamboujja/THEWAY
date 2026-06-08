import { apiClient, uploadForm, unwrap } from './client.js';

export async function uploadProfilePhoto(file) {
  const presignPayload = await apiClient.post('/api/files/presign', {
    originalName: file.name,
    mimeType: file.type,
    size: file.size,
    ownerType: 'profile'
  });
  const prepared = unwrap(presignPayload);
  const uploadUrl = prepared?.upload?.url;
  const fileId = prepared?.file?.id || prepared?.file?.id_file;
  if (!uploadUrl || !fileId) {
    throw new Error('Upload photo indisponible.');
  }

  const form = new FormData();
  form.append('file', file);
  const payload = await uploadForm(uploadUrl, form);
  return unwrap(payload, 'file');
}
