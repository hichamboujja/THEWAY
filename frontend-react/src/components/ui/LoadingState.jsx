import { Loader2 } from 'lucide-react';
import styles from './State.module.css';

export default function LoadingState({ label = 'Chargement', compact = false }) {
  return (
    <div className={compact ? styles.compact : styles.state}>
      <Loader2 className={styles.spin} size={22} />
      <p>{label}</p>
    </div>
  );
}
