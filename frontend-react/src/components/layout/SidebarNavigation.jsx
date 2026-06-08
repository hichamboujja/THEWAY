import { NavLink } from 'react-router-dom';
import { BarChart3, BriefcaseBusiness, FileText, Gauge, LayoutDashboard, LifeBuoy, LogIn, Receipt, Settings, Shield, Sparkles, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import iconImage from '../../../../assets/images/icon.png';
import styles from './SidebarNavigation.module.css';

const userItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/opportunities', label: 'Opportunites', icon: BriefcaseBusiness },
  { to: '/skills', label: 'Competences', icon: Sparkles },
  { to: '/cv', label: 'CV', icon: FileText },
  { to: '/matching', label: 'Matching', icon: Gauge },
  { to: '/settings', label: 'Parametres', icon: Settings }
];

const adminItems = [
  { to: '/admin', label: 'Admin', icon: BarChart3 },
  { to: '/admin/users', label: 'Utilisateurs', icon: Users },
  { to: '/admin/offers', label: 'Offres', icon: BriefcaseBusiness },
  { to: '/admin/skills', label: 'Skills admin', icon: Sparkles },
  { to: '/admin/support', label: 'Support', icon: LifeBuoy },
  { to: '/admin/billing', label: 'Billing', icon: Receipt },
  { to: '/admin/settings', label: 'Roles', icon: Shield }
];

export default function SidebarNavigation({ open = false, onNavigate }) {
  const { authenticated, isAdmin } = useAuth();
  const sections = authenticated
    ? [
        { label: 'Espace candidat', items: userItems },
        ...(isAdmin ? [{ label: 'Administration', items: adminItems }] : [])
      ]
    : [
        {
          label: 'Preview',
          items: [
            { to: '/settings', label: 'Parametres', icon: Settings },
            { to: '/login', label: 'Connexion', icon: LogIn }
          ]
        }
      ];

  return (
    <aside
      id="dashboard-navigation"
      className={[styles.sidebar, open ? styles.open : ''].filter(Boolean).join(' ')}
    >
      <div className={styles.brand}>
        <img className={styles.brandIcon} src={iconImage} alt="" />
        <div>
          <strong>TheWay</strong>
          <small>Platform</small>
        </div>
      </div>
      <nav className={styles.nav}>
        {sections.map(section => (
          <div key={section.label} className={styles.section}>
            <span className={styles.sectionLabel}>{section.label}</span>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/admin'}
                  onClick={onNavigate}
                  className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
