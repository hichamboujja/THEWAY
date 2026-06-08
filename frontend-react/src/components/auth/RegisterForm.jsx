import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, MapPin, User, UserPlus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import Button from '../ui/Button.jsx';
import ErrorState from '../ui/ErrorState.jsx';
import styles from './Forms.module.css';

export default function RegisterForm() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', password: '', localisation: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await auth.signUp(form);
      navigate('/dashboard', { replace: true });
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error ? <ErrorState compact title="Inscription impossible" message={error} /> : null}
      <div className={styles.twoColumns}>
        <label>Prenom<span className={styles.inputShell}><User size={18} aria-hidden="true" /><input autoComplete="given-name" placeholder="Prenom" value={form.prenom} onChange={(event) => setForm({ ...form, prenom: event.target.value })} required /></span></label>
        <label>Nom<span className={styles.inputShell}><User size={18} aria-hidden="true" /><input autoComplete="family-name" placeholder="Nom" value={form.nom} onChange={(event) => setForm({ ...form, nom: event.target.value })} required /></span></label>
      </div>
      <label>Email<span className={styles.inputShell}><Mail size={18} aria-hidden="true" /><input type="email" autoComplete="email" placeholder="votre@email.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></span></label>
      <label>Mot de passe<span className={styles.inputShell}><Lock size={18} aria-hidden="true" /><input type="password" minLength={10} autoComplete="new-password" placeholder="10 caracteres minimum" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></span></label>
      <label>Localisation<span className={styles.inputShell}><MapPin size={18} aria-hidden="true" /><input autoComplete="address-level2" placeholder="Ville ou region" value={form.localisation} onChange={(event) => setForm({ ...form, localisation: event.target.value })} /></span></label>
      <Button type="submit" loading={submitting} icon={UserPlus}>Creer mon compte</Button>
      <p className={styles.footerText}>Deja inscrit ? <Link to="/login">Se connecter</Link></p>
    </form>
  );
}
