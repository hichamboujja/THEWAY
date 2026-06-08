import { Link } from 'react-router-dom';
import { LogIn, LogOut, Menu, UserCircle, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import Button from '../ui/Button.jsx';
import styles from './TopHeader.module.css';

export default function TopHeader({ menuOpen = false, onMenuToggle }) {
  const { authenticated, user, signOut } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.identity}>
        <button
          className={styles.menuButton}
          type="button"
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={menuOpen}
          aria-controls="dashboard-navigation"
          onClick={onMenuToggle}
        >
          {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
        <div>
          <strong>{user?.name || user?.email || 'TheWay'}</strong>
          <small>{authenticated ? user?.role || 'user' : 'preview'}</small>
        </div>
      </div>
      <div className={styles.actions}>
        <Link className={styles.profileLink} to="/settings" aria-label="Ouvrir les parametres">
          <UserCircle size={22} />
        </Link>
        {authenticated ? (
          <Button variant="ghost" size="sm" icon={LogOut} onClick={signOut}>Sortir</Button>
        ) : (
          <Button as={Link} to="/login" variant="secondary" size="sm" icon={LogIn}>Connexion</Button>
        )}
      </div>
    </header>
  );
}
