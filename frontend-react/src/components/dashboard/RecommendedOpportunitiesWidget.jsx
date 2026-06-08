import { Link } from 'react-router-dom';
import { ArrowRight, Target } from 'lucide-react';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import styles from './RecommendedOpportunitiesWidget.module.css';

export default function RecommendedOpportunitiesWidget({ matches = [], opportunities = [] }) {
  const items = buildRecommendations(matches, opportunities).slice(0, 4);

  return (
    <Card className={styles.widget}>
      <div className={styles.header}>
        <span><Target size={18} /> Recommended opportunities</span>
        <Button as={Link} to="/matching" variant="secondary" size="sm" icon={ArrowRight}>Matching</Button>
      </div>
      <div className={styles.list}>
        {items.length ? items.map(item => (
          <Link key={item.id || item.uid || item.title} to={item.id || item.uid ? `/opportunities/${item.id || item.uid}` : '/matching'} className={styles.item}>
            <div className={styles.score}>{item.score || '--'}</div>
            <div>
              <strong>{item.title || 'Opportunite recommandee'}</strong>
              <p>{item.company || 'Entreprise non specifiee'} · {item.location || 'Lieu non specifie'}</p>
            </div>
          </Link>
        )) : (
          <p className={styles.empty}>Lance un matching pour obtenir des recommandations.</p>
        )}
      </div>
    </Card>
  );
}

function buildRecommendations(matches, opportunities) {
  if (matches.length) {
    return matches.map(match => {
      const opportunity = match.opportunity || match;
      return {
        ...opportunity,
        score: formatScore(match.score || match.match_score || match.matchScore),
        id: match.opportunity_id || opportunity.id || opportunity.uid
      };
    });
  }

  return opportunities.map(item => ({
    ...item,
    score: formatScore(item.score || item.match_score || item.matchScore)
  }));
}

function formatScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score) || score <= 0) return '';
  return `${Math.round(score > 1 ? score : score * 100)}%`;
}
