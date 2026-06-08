import EmptyState from '../ui/EmptyState.jsx';
import LoadingState from '../ui/LoadingState.jsx';
import OpportunityCard from './OpportunityCard.jsx';
import styles from './OpportunityList.module.css';

export default function OpportunityList({ opportunities, loading, onSaved }) {
  if (loading) return <LoadingState label="Chargement des opportunites" />;
  if (!opportunities?.length) return <EmptyState title="Aucune opportunite" message="Aucune offre ne correspond aux filtres actuels." />;

  return (
    <div className={styles.grid}>
      {opportunities.map((opportunity) => (
        <OpportunityCard key={opportunity.id || opportunity.uid} opportunity={opportunity} onSaved={onSaved} />
      ))}
    </div>
  );
}
