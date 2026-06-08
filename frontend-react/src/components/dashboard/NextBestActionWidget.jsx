import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Rocket } from 'lucide-react';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import styles from './NextBestActionWidget.module.css';

export default function NextBestActionWidget({ steps = [] }) {
  const primary = steps[0];
  const secondary = steps.slice(1);

  return (
    <Card className={styles.widget}>
      <div className={styles.header}>
        <span><Rocket size={18} /> Next best action</span>
        {primary ? <small>Priorite 1</small> : <small>Profil pret</small>}
      </div>

      {primary ? (
        <>
          <Link to={primary.to} className={styles.primaryAction}>
            <span className={styles.rank}>{primary.icon}</span>
            <div>
              <strong>{primary.title}</strong>
              <p>{primary.description}</p>
            </div>
            <ArrowRight size={18} />
          </Link>

          <div className={styles.secondaryList}>
            {secondary.map(step => (
              <Link key={step.title} to={step.to} className={styles.secondaryAction}>
                <span>{step.icon}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.description}</p>
                </div>
              </Link>
            ))}
          </div>

          <Button as={Link} to={primary.to} icon={ArrowRight}>
            {primary.cta || primary.title}
          </Button>
        </>
      ) : (
        <div className={styles.readyState}>
          <CheckCircle2 size={28} />
          <strong>Profil pret a candidater</strong>
          <p>Ton espace est alimente. Consulte les offres recentes et garde le matching a jour.</p>
          <Button as={Link} to="/opportunities" icon={ArrowRight}>Voir les offres</Button>
        </div>
      )}
    </Card>
  );
}
