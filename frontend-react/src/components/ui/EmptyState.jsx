import { Inbox } from 'lucide-react';
import styles from './State.module.css';

export default function EmptyState({ title = 'Aucune donnee', message = 'Rien a afficher pour le moment.' }) {
  return (
    <div className={styles.state}>
      <Inbox size={26} />
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}
