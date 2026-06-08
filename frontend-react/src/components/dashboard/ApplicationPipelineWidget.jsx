import { Link } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Clock3, Send } from 'lucide-react';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import styles from './ApplicationPipelineWidget.module.css';

const COLUMNS = [
  { key: 'saved', label: 'Sauvees', icon: BriefcaseBusiness },
  { key: 'ready', label: 'A candidater', icon: Clock3 },
  { key: 'applied', label: 'Postulees', icon: Send },
  { key: 'active', label: 'En cours', icon: CheckCircle2 }
];

export default function ApplicationPipelineWidget({ opportunities = [] }) {
  const pipeline = buildPipeline(opportunities);
  const total = COLUMNS.reduce((sum, column) => sum + pipeline[column.key].length, 0);

  return (
    <Card className={styles.widget}>
      <div className={styles.header}>
        <div>
          <span>Pipeline candidature</span>
          <p>{total ? `${total} piste${total > 1 ? 's' : ''} suivie${total > 1 ? 's' : ''}` : 'Aucune piste qualifiee dans l apercu'}</p>
        </div>
        <Button as={Link} to="/opportunities" variant="secondary" size="sm" icon={ArrowRight}>Gerer</Button>
      </div>

      <div className={styles.columns}>
        {COLUMNS.map(column => {
          const Icon = column.icon;
          const items = pipeline[column.key];

          return (
            <div key={column.key} className={styles.column}>
              <div className={styles.columnHeader}>
                <span><Icon size={15} />{column.label}</span>
                <strong>{items.length}</strong>
              </div>
              <div className={styles.items}>
                {items.slice(0, 2).map(item => (
                  <Link key={item.id || item.uid || item.title} to={item.id || item.uid ? `/opportunities/${item.id || item.uid}` : '/opportunities'} className={styles.item}>
                    <strong>{item.title || 'Opportunite'}</strong>
                    <p>{item.company || item.entreprise || 'Entreprise non specifiee'}</p>
                  </Link>
                ))}
                {!items.length ? <p className={styles.empty}>Rien ici</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function buildPipeline(opportunities) {
  const pipeline = {
    saved: [],
    ready: [],
    applied: [],
    active: []
  };

  opportunities.forEach(opportunity => {
    const status = String(opportunity.status || opportunity.application_status || '').toLowerCase();
    if (status.includes('interview') || status.includes('review') || status.includes('cours')) {
      pipeline.active.push(opportunity);
    } else if (opportunity.applied || status.includes('applied') || status.includes('postul')) {
      pipeline.applied.push(opportunity);
    } else if (opportunity.saved) {
      pipeline.saved.push(opportunity);
    } else {
      pipeline.ready.push(opportunity);
    }
  });

  return pipeline;
}
