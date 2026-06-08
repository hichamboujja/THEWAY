import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import LoadingState from '../ui/LoadingState.jsx';

export default function SessionGuard() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.loading) return <LoadingState label="Verification de la session" />;
  if (!auth.authenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
