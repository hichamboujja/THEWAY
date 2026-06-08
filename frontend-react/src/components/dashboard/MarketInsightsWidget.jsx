import { MapPin, TrendingUp } from 'lucide-react';
import Card from '../ui/Card.jsx';
import styles from './SimpleDashboardWidget.module.css';

export default function MarketInsightsWidget({ opportunities = [] }) {
  const locations = aggregate(opportunities.map(item => item.location).filter(Boolean)).slice(0, 3);
  const skills = aggregate(opportunities.flatMap(item => normaliseSkills(item.skills))).slice(0, 3);
  const companies = new Set(opportunities.map(item => item.company).filter(Boolean)).size;

  return (
    <Card className={styles.wideWidget}>
      <div className={styles.header}>
        <span><TrendingUp size={18} /> Market insights</span>
        <strong>{opportunities.length}</strong>
      </div>
      <div className={styles.insightsGrid}>
        <Insight title="Entreprises" value={companies} />
        <Insight title="Top lieux" value={locations[0]?.label || '--'} helper={locations.map(item => `${item.label} (${item.count})`).join(', ')} />
        <Insight title="Top skills" value={skills[0]?.label || '--'} helper={skills.map(item => `${item.label} (${item.count})`).join(', ')} />
        <Insight title="Sources" value={new Set(opportunities.map(item => item.source).filter(Boolean)).size} icon={MapPin} />
      </div>
    </Card>
  );
}

function Insight({ title, value, helper }) {
  return (
    <div className={styles.insight}>
      <span>{title}</span>
      <strong>{value}</strong>
      {helper ? <p>{helper}</p> : null}
    </div>
  );
}

function aggregate(values) {
  const counts = values.reduce((map, value) => map.set(value, (map.get(value) || 0) + 1), new Map());
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

function normaliseSkills(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(/[,;|]/).map(item => item.trim()).filter(Boolean);
  return [];
}
