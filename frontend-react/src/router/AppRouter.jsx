import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from '../components/layout/AppShell.jsx';
import SessionGuard from '../components/auth/SessionGuard.jsx';
import RoleGuard from '../components/auth/RoleGuard.jsx';
import IndexPage from '../pages/IndexPage.jsx';
import LoginPage from '../pages/auth/LoginPage.jsx';
import RegisterPage from '../pages/auth/RegisterPage.jsx';
import DashboardPage from '../pages/user/DashboardPage.jsx';
import OpportunitiesPage from '../pages/user/OpportunitiesPage.jsx';
import OpportunityDetailsPage from '../pages/user/OpportunityDetailsPage.jsx';
import SkillsPage from '../pages/user/SkillsPage.jsx';
import CVPage from '../pages/user/CVPage.jsx';
import MatchingPage from '../pages/user/MatchingPage.jsx';
import SettingsPage from '../pages/user/SettingsPage.jsx';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage.jsx';
import AdminUsersPage from '../pages/admin/AdminUsersPage.jsx';
import AdminOffersPage from '../pages/admin/AdminOffersPage.jsx';
import AdminSkillsPage from '../pages/admin/AdminSkillsPage.jsx';
import AdminSettingsPage from '../pages/admin/AdminSettingsPage.jsx';
import AdminSupportPage from '../pages/admin/AdminSupportPage.jsx';
import AdminBillingPage from '../pages/admin/AdminBillingPage.jsx';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<IndexPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<AppShell />}>
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route element={<SessionGuard />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/opportunities" element={<OpportunitiesPage />} />
          <Route path="/opportunities/:id" element={<OpportunityDetailsPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/skils" element={<Navigate to="/skills" replace />} />
          <Route path="/cv" element={<CVPage />} />
          <Route path="/matching" element={<MatchingPage />} />

          <Route element={<RoleGuard role="admin" />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/offers" element={<AdminOffersPage />} />
            <Route path="/admin/skills" element={<AdminSkillsPage />} />
            <Route path="/admin/support" element={<AdminSupportPage />} />
            <Route path="/admin/billing" element={<AdminBillingPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
