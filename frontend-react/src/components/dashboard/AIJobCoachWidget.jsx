import { Link } from 'react-router-dom';
import { ArrowRight, MessageSquareText } from 'lucide-react';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import styles from './SimpleDashboardWidget.module.css';

export default function AIJobCoachWidget({ cv, skills = [], matches = [] }) {
  const prompts = [
    cv ? 'Ameliore le resume de mon CV' : 'Aide-moi a preparer mon premier CV',
    skills.length ? 'Quelles competences dois-je renforcer ?' : 'Propose mes premieres competences',
    matches.length ? 'Explique mon meilleur matching' : 'Prepare mon profil pour le matching'
  ];

  return (
    <Card className={styles.widget}>
      <div className={styles.header}>
        <span><MessageSquareText size={18} /> AI job coach</span>
      </div>
      <div className={styles.promptList}>
        {prompts.map(prompt => <span key={prompt}>{prompt}</span>)}
      </div>
      <Button as={Link} to={cv ? '/cv' : '/skills'} size="sm" icon={ArrowRight}>Ouvrir le coach</Button>
    </Card>
  );
}
