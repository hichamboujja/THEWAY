import { Bell } from 'lucide-react';
import Card from '../ui/Card.jsx';
import styles from './SimpleDashboardWidget.module.css';

export default function NotificationCenterWidget({ cv, matches = [], opportunities = [] }) {
  const notifications = [
    cv ? { title: 'CV actif disponible', text: cv.fichier || cv.filename || 'CV importe' } : { title: 'CV manquant', text: 'Importe un CV pour activer l analyse.' },
    matches.length ? { title: 'Matching pret', text: `${matches.length} recommandation${matches.length > 1 ? 's' : ''} disponible${matches.length > 1 ? 's' : ''}.` } : { title: 'Matching a lancer', text: 'Classe les offres selon ton profil.' },
    opportunities.some(item => item.saved) ? { title: 'Offres sauvegardees', text: 'Reviens sur tes pistes prioritaires.' } : { title: 'Aucune sauvegarde', text: 'Sauvegarde les offres interessantes.' }
  ];

  return (
    <Card className={styles.widget}>
      <div className={styles.header}>
        <span><Bell size={18} /> Notifications</span>
        <strong>{notifications.length}</strong>
      </div>
      <div className={styles.list}>
        {notifications.map(item => (
          <div key={item.title} className={styles.note}>
            <strong>{item.title}</strong>
            <p>{item.text}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
