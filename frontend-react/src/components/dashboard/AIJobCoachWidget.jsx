import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, MessageSquareText } from 'lucide-react';
import { getCoachTips } from '../../api/aiApi.js';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import styles from './SimpleDashboardWidget.module.css';

export default function AIJobCoachWidget({ cv, skills = [], matches = [] }) {
  const fallbackPrompts = useMemo(() => [
    cv ? 'Ameliore le resume de mon CV' : 'Aide-moi a preparer mon premier CV',
    skills.length ? 'Quelles competences dois-je renforcer ?' : 'Propose mes premieres competences',
    matches.length ? 'Explique mon meilleur matching' : 'Prepare mon profil pour le matching'
  ], [cv, skills.length, matches.length]);
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const visibleTips = loading && !tips.length ? ['Chargement du coach...'] : (tips.length ? tips : fallbackPrompts);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCoachTips({
      skills,
      cvSummary: cv?.scann_analyse || cv?.summary || cv?.original_name || cv?.filename || '',
      bestMatch: matches[0] || null
    }).then(result => {
      if (cancelled) return;
      const nextTips = Array.isArray(result?.tips) ? result.tips.filter(Boolean).slice(0, 5) : [];
      setTips(nextTips);
    }).catch(apiError => {
      if (!cancelled) setError(apiError.message || 'Coach indisponible');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [cv, skills, matches, fallbackPrompts]);

  return (
    <Card className={styles.widget}>
      <div className={styles.header}>
        <span><MessageSquareText size={18} /> AI job coach</span>
      </div>
      {error ? <p className={styles.empty}>{error}. Suggestions de base affichees.</p> : null}
      <div className={styles.promptList}>
        {visibleTips.map(prompt => <span key={prompt}>{prompt}</span>)}
      </div>
      <Button as={Link} to={cv ? '/cv' : '/skills'} size="sm" icon={ArrowRight}>Ouvrir le coach</Button>
    </Card>
  );
}
