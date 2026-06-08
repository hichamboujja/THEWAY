import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import ErrorState from '../ui/ErrorState.jsx';
import LoadingState from '../ui/LoadingState.jsx';

export default function RoleGuard({ role = 'admin' }) {
  const auth = useAuth();

  if (auth.loading) return <LoadingState label="Verification des droits" />;
  if (!auth.authenticated) return <Navigate to="/login" replace />;
  if (role === 'admin' && !auth.isAdmin) {
    return <ErrorState title="Acces restreint" message="Cette page est reservee aux administrateurs." />;
  }
  return <Outlet />;
}
