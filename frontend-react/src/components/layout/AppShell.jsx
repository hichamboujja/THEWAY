import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import SidebarNavigation from './SidebarNavigation.jsx';
import TopHeader from './TopHeader.jsx';
import styles from './AppShell.module.css';

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }

    function handleResize() {
      if (window.innerWidth > 900) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', handleResize);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [menuOpen]);

  return (
    <div className={[styles.shell, menuOpen ? styles.menuOpen : ''].filter(Boolean).join(' ')}>
      <button
        className={styles.backdrop}
        type="button"
        aria-label="Fermer le menu"
        onClick={() => setMenuOpen(false)}
      />
      <SidebarNavigation open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      <div className={styles.main}>
        <TopHeader menuOpen={menuOpen} onMenuToggle={() => setMenuOpen(current => !current)} />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
