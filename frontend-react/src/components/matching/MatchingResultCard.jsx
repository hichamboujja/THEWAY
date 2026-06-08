import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import MatchScoreCircle from './MatchScoreCircle.jsx';
import MatchingExplainabilityWidget from './MatchingExplainabilityWidget.jsx';
import styles from './MatchingResultCard.module.css';

export default function MatchingResultCard({ result }) {
  const opportunity = result.opportunity || result;
  const opportunityId = result.opportunity_id || opportunity.id || opportunity.uid;
  return (
    <Card className={styles.card}>
      <MatchScoreCircle score={result.score || result.match_score || result.matchScore} />
      <div className={styles.content}>
        {opportunityId ? (
          <Link className={styles.title} to={`/opportunities/${opportunityId}`}>
            {opportunity.title || result.title || 'Opportunite'}
          </Link>
        ) : (
          <h3>{opportunity.title || result.title || 'Opportunite'}</h3>
        )}
        <p>{opportunity.company || result.company || 'Entreprise non specifiee'}</p>
        <MatchingExplainabilityWidget result={result} />
        {opportunityId ? (
          <Button as={Link} to={`/opportunities/${opportunityId}`} variant="secondary" size="sm" icon={ArrowRight}>
            Voir l'offre
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
