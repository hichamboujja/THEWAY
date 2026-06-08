import { Gauge } from 'lucide-react';
import Card from '../ui/Card.jsx';
import styles from './CareerScoreWidget.module.css';

export default function CareerScoreWidget({ cv, skills = [], matches = [], opportunities = [] }) {
  const saved = opportunities.filter(item => item.saved).length;
  const applied = opportunities.filter(item => item.applied).length;
  const cvScore = cv ? 25 : 0;
  const skillScore = Math.min(30, skills.length * 5);
  const matchScore = matches.length ? Math.min(25, 10 + matches.length * 5) : 0;
  const activityScore = Math.min(20, saved * 4 + applied * 8);
  const score = Math.min(100, cvScore + skillScore + matchScore + activityScore);

  const parts = [
    ['CV', cvScore, 25],
    ['Skills', skillScore, 30],
    ['Matching', matchScore, 25],
    ['Activite', activityScore, 20]
  ];

  return (
    <Card className={styles.widget}>
      <div className={styles.header}>
        <span><Gauge size={18} /> Career score</span>
        <strong>{score}</strong>
      </div>
      <div className={styles.ring} style={{ '--progress': `${score * 3.6}deg` }}>
        <span>{score}%</span>
      </div>
      <div className={styles.parts}>
        {parts.map(([label, value, max]) => (
          <div key={label}>
            <span>{label}</span>
            <i><b style={{ width: `${(value / max) * 100}%` }} /></i>
          </div>
        ))}
      </div>
    </Card>
  );
}
