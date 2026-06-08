import Card from '../ui/Card.jsx';
import styles from './AdminStatsGrid.module.css';

export default function AdminStatsGrid({ summary = {} }) {
  const items = [
    ['Opportunites', summary.opportunities],
    ['Entreprises', summary.companies],
    ['Utilisateurs', summary.users],
    ['Competences', summary.skills]
  ];
  return (
    <div className={styles.grid}>
      {items.map(([label, value]) => (
        <Card key={label}>
          <span>{label}</span>
          <strong>{Number(value) || 0}</strong>
        </Card>
      ))}
    </div>
  );
}
