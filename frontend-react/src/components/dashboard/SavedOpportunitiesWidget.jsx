import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark } from 'lucide-react';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import styles from './SimpleDashboardWidget.module.css';

export default function SavedOpportunitiesWidget({ opportunities = [] }) {
  const saved = opportunities.filter(item => item.saved).slice(0, 4);

  return (
    <Card className={styles.widget}>
      <div className={styles.header}>
        <span><Bookmark size={18} /> Offres sauvegardees</span>
        <strong>{saved.length}</strong>
      </div>
      <div className={styles.list}>
        {saved.length ? saved.map(item => (
          <Link key={item.id || item.uid || item.title} to={item.id || item.uid ? `/opportunities/${item.id || item.uid}` : '/opportunities'} className={styles.row}>
            <div>
              <strong>{item.title || 'Opportunite'}</strong>
              <p>{item.company || 'Entreprise non specifiee'} · {item.location || 'Lieu non specifie'}</p>
            </div>
            <span>{scoreOf(item)}</span>
          </Link>
        )) : <p className={styles.empty}>Aucune offre sauvegardee dans l apercu.</p>}
      </div>
      <Button as={Link} to="/opportunities" variant="secondary" size="sm" icon={ArrowRight}>Explorer</Button>
    </Card>
  );
}

function scoreOf(item) {
  const score = Number(item.score || item.match_score || item.matchScore);
  return Number.isFinite(score) && score > 0 ? `${Math.round(score > 1 ? score : score * 100)}%` : '--';
}
