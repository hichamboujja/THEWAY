import { FileText } from 'lucide-react';
import Card from '../ui/Card.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import styles from './CVCurrentFileCard.module.css';

export default function CVCurrentFileCard({ cv }) {
  const current = cv?.cv || cv?.file || cv;
  if (!current) return <EmptyState title="Aucun CV" message="Importe un CV pour lancer l'analyse et le matching." />;

  return (
    <Card className={styles.card}>
      <FileText size={24} />
      <div>
        <h3>{current.fichier || current.filename || current.name || 'CV actuel'}</h3>
        <p>{current.date_upload || current.created_at || 'Date non disponible'}</p>
      </div>
    </Card>
  );
}
