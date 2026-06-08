import { FileCheck2 } from 'lucide-react';
import Badge from '../ui/Badge.jsx';
import Card from '../ui/Card.jsx';
import styles from './CVHealthWidget.module.css';

export default function CVHealthWidget({ cv, analysis }) {
  const health = buildHealth(cv, analysis);

  return (
    <Card className={styles.widget}>
      <div className={styles.header}>
        <span><FileCheck2 size={18} /> CV health</span>
        <Badge tone={health.score >= 75 ? 'success' : health.score >= 45 ? 'warning' : 'info'}>{health.score}%</Badge>
      </div>
      <div className={styles.score}>
        <i style={{ width: `${health.score}%` }} />
      </div>
      <div className={styles.grid}>
        {health.items.map(item => (
          <div key={item.label} className={item.done ? styles.done : ''}>
            <strong>{item.label}</strong>
            <p>{item.text}</p>
          </div>
        ))}
      </div>
      <div className={styles.suggestions}>
        <span>Suggestions</span>
        {health.suggestions.map(item => <p key={item}>{item}</p>)}
      </div>
    </Card>
  );
}

function buildHealth(cv, analysis) {
  const extracted = analysis?.extractedSkills || analysis?.extracted_skills || analysis?.skills || analysis?.competences || [];
  const summary = analysis?.summary || analysis?.resume || analysis?.scann_analyse || '';
  const suggestions = analysis?.suggestions || analysis?.recommendations || [];
  const hasCv = Boolean(cv);
  const hasAnalysis = Boolean(analysis);
  const hasSkills = Array.isArray(extracted) ? extracted.length >= 3 : Boolean(extracted);
  const hasSummary = String(summary).length > 80;

  const items = [
    { label: 'ATS readiness', done: hasCv && hasAnalysis, text: hasAnalysis ? 'Analyse IA disponible.' : 'Lance une analyse pour detecter les signaux ATS.' },
    { label: 'Mots-cles', done: hasSkills, text: hasSkills ? 'Competences extraites du CV.' : 'Ajoute plus de mots-cles metier.' },
    { label: 'Clarte', done: hasSummary, text: hasSummary ? 'Resume suffisamment detaille.' : 'Renforce le resume et les missions.' },
    { label: 'Structure', done: hasCv, text: hasCv ? 'Fichier CV actif.' : 'Importe un CV PDF ou DOCX.' }
  ];

  const score = Math.round((items.filter(item => item.done).length / items.length) * 100);
  const fallback = [
    hasCv ? 'Relance l analyse apres chaque modification du CV.' : 'Importe ton CV pour debloquer l analyse.',
    hasSkills ? 'Transforme les competences extraites en competences suivies.' : 'Ajoute les competences les plus demandees dans tes offres ciblees.'
  ];

  return { score, items, suggestions: (Array.isArray(suggestions) && suggestions.length ? suggestions : fallback).slice(0, 3) };
}
