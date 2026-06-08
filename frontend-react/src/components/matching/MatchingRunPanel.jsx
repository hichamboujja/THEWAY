import { Play } from 'lucide-react';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import styles from './MatchingRunPanel.module.css';

export default function MatchingRunPanel({ onRun, loading }) {
  return (
    <Card className={styles.panel}>
      <div>
        <h3>Lancer un matching</h3>
        <p>Le backend compare ton profil, ton CV et les opportunites disponibles.</p>
      </div>
      <Button icon={Play} loading={loading} onClick={onRun}>Lancer</Button>
    </Card>
  );
}
