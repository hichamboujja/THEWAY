import { apiClient, unwrap } from './client.js';
import { listOpportunities } from './opportunitiesApi.js';
import { createSkill, deleteSkill, updateSkill } from './skillsApi.js';

export async function getPanelSummary() {
  const payload = await apiClient.get('/api/admin/dashboard');
  const data = unwrap(payload);
  const totals = data?.totals || data?.summary || {};
  return {
    ...data,
    summary: {
      opportunities: Number(totals.opportunities ?? totals.offers ?? 0) || 0,
      companies: Number(totals.companies ?? totals.enterprises ?? 0) || 0,
      users: Number(totals.users ?? 0) || 0,
      skills: Number(totals.skills ?? 0) || 0,
      cvs: Number(totals.cvs ?? 0) || 0,
      matching: Number(totals.matching ?? 0) || 0,
      averageMatchingScore: Number(totals.averageMatchingScore ?? 0) || 0,
      databaseOffers: Number(totals.databaseOffers ?? 0) || 0
    },
    recentOpportunities: data?.recentOpportunities || data?.recentOffers || [],
    recentUsers: data?.recentUsers || [],
    latestNotifications: data?.latestNotifications || [],
    importJobs: data?.importJobs || [],
    recentActivity: data?.recentActivity || [],
    progression: data?.progression || {}
  };
}

export async function getPanelSkills() {
  const payload = await apiClient.get('/api/admin/skills', { params: { limit: 120 } });
  return unwrap(payload, 'skills') || [];
}

export async function getPanelUsers() {
  const payload = await apiClient.get('/api/admin/users', { params: { limit: 200 } });
  return unwrap(payload, 'users') || [];
}

export async function getRoles() {
  const payload = await apiClient.get('/api/admin/roles');
  return unwrap(payload);
}

export async function getSupportTickets(params = { limit: 50 }) {
  const payload = await apiClient.get('/api/admin/support', { params });
  return unwrap(payload, 'tickets') || [];
}

export async function getInvoices(params = { limit: 50 }) {
  const payload = await apiClient.get('/api/admin/invoices', { params });
  return unwrap(payload, 'invoices') || [];
}

export async function getPlans() {
  const payload = await apiClient.get('/api/plans');
  return unwrap(payload, 'plans') || [];
}

export const listAdminUsers = getPanelUsers;
export const listAdminSkills = getPanelSkills;

export async function listAdminOffers(params = { limit: 100 }) {
  const result = await listOpportunities(params);
  return result.opportunities || [];
}

export const createAdminSkill = createSkill;
export const updateAdminSkill = updateSkill;
export const deleteAdminSkill = deleteSkill;

export async function createAdminUser() {
  throw new Error('Creation utilisateur admin non exposee par le backend actuel.');
}

export async function updateAdminUser() {
  throw new Error('Modification utilisateur admin non exposee par le backend actuel.');
}

export async function deleteAdminUser() {
  throw new Error('Suppression utilisateur admin non exposee par le backend actuel.');
}

export async function createAdminOffer() {
  throw new Error('Creation offre admin non exposee par le backend actuel.');
}

export async function updateAdminOffer() {
  throw new Error('Modification offre admin non exposee par le backend actuel.');
}

export async function deleteAdminOffer() {
  throw new Error('Suppression offre admin non exposee par le backend actuel.');
}
