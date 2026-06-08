import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/authApi.js';

export const AuthContext = createContext(null);

function normalizeUser(user) {
  if (!user) return null;
  const roles = Array.isArray(user.roles) ? user.roles : [user.role || 'user'];
  return {
    ...user,
    id: user.id || user.id_user,
    name: user.name || [user.prenom, user.nom].filter(Boolean).join(' ') || user.email,
    role: roles.includes('admin') ? 'admin' : user.role || roles[0] || 'user',
    roles
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [csrfToken, setCsrfToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await authApi.fetchSession();
      setUser(normalizeUser(session.user));
      setCsrfToken(session.csrfToken || '');
      return session;
    } catch (sessionError) {
      setUser(null);
      setError(sessionError.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const signIn = useCallback(async (credentials) => {
    const result = await authApi.login(credentials);
    setUser(normalizeUser(result.user));
    setCsrfToken(result.csrfToken || '');
    return result;
  }, []);

  const signUp = useCallback(async (input) => {
    const result = await authApi.register(input);
    setUser(normalizeUser(result.user));
    setCsrfToken(result.csrfToken || '');
    return result;
  }, []);

  const signOut = useCallback(async () => {
    await authApi.logout().catch(() => null);
    setUser(null);
    setCsrfToken('');
  }, []);

  const value = useMemo(() => ({
    user,
    csrfToken,
    loading,
    error,
    authenticated: Boolean(user),
    isAdmin: user?.role === 'admin' || user?.roles?.includes('admin'),
    refreshSession,
    signIn,
    signUp,
    signOut
  }), [csrfToken, error, loading, refreshSession, signIn, signOut, signUp, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
