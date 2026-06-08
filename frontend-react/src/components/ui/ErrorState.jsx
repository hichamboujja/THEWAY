import { AlertCircle } from 'lucide-react';
import Button from './Button.jsx';
import styles from './State.module.css';

export default function ErrorState({ title = 'Erreur', message = 'Une erreur est survenue.', onRetry, compact = false }) {
  return (
    <div className={compact ? styles.inlineError : styles.state}>
      <AlertCircle size={compact ? 18 : 24} />
      <div>
        <h3>{title}</h3>
        <p>{message}</p>
      </div>
      {onRetry ? <Button variant="secondary" size="sm" onClick={onRetry}>Reessayer</Button> : null}
    </div>
  );
}
