import { ExternalLink } from 'lucide-react';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import OpportunityApplyButton from './OpportunityApplyButton.jsx';
import OpportunityBookmarkButton from './OpportunityBookmarkButton.jsx';
import styles from './OpportunityDetails.module.css';

export default function OpportunityDetails({ opportunity }) {
  return (
    <div className={styles.details}>
      <Card className={styles.main}>
        <div className={styles.header}>
          <div>
            <h2>{opportunity.title}</h2>
            <p>{opportunity.company || 'Entreprise non specifiee'} - {opportunity.location || 'Localisation non specifiee'}</p>
          </div>
          <div className={styles.actions}>
            <OpportunityBookmarkButton opportunity={opportunity} />
            <OpportunityApplyButton opportunity={opportunity} />
          </div>
        </div>
        <div className={styles.skills}>{(opportunity.skills || []).map((skill) => <Badge key={skill} tone="info">{skill}</Badge>)}</div>
        <p className={styles.description}>{opportunity.description}</p>
      </Card>
      <Card>
        <h3>Source</h3>
        <p>{opportunity.source || 'Non specifiee'}</p>
        {opportunity.source_url ? <Button as="a" href={opportunity.source_url} target="_blank" rel="noreferrer" icon={ExternalLink}>Voir l'offre</Button> : null}
      </Card>
    </div>
  );
}
