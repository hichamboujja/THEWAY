import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, LogIn, Mail } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import Button from '../ui/Button.jsx';
import ErrorState from '../ui/ErrorState.jsx';
import styles from './Forms.module.css';

export default function LoginForm() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await auth.signIn(form);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error ? <ErrorState compact title="Connexion impossible" message={error} /> : null}
      <label>
        Email
        <span className={styles.inputShell}>
          <Mail size={18} aria-hidden="true" />
          <input type="email" autoComplete="email" placeholder="votre@email.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
        </span>
      </label>
      <label>
        Mot de passe
        <span className={styles.inputShell}>
          <Lock size={18} aria-hidden="true" />
          <input type="password" autoComplete="current-password" placeholder="Votre mot de passe" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
        </span>
      </label>
      <Button type="submit" loading={submitting} icon={LogIn}>Se connecter</Button>
      <p className={styles.footerText}>Pas encore de compte ? <Link to="/register">Creer un compte</Link></p>
    </form>
  );
}
