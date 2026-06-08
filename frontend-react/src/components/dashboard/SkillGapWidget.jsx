import { Link } from 'react-router-dom';
import { ArrowRight, Layers3, TrendingUp } from 'lucide-react';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import styles from './SkillGapWidget.module.css';

export default function SkillGapWidget({ skills = [], opportunities = [] }) {
  const userSkills = new Set(skills.map(skill => normaliseName(skill.nom || skill.name || skill)).filter(Boolean));
  const demand = collectDemand(opportunities);
  const gaps = demand.filter(item => !userSkills.has(normaliseName(item.label))).slice(0, 5);
  const ownedInDemand = demand.filter(item => userSkills.has(normaliseName(item.label))).slice(0, 3);

  return (
    <Card className={styles.widget}>
      <div className={styles.header}>
        <span><Layers3 size={18} /> Skill gaps</span>
        <Badge tone={gaps.length ? 'warning' : 'success'}>{gaps.length ? `${gaps.length} priorites` : 'A jour'}</Badge>
      </div>

      {gaps.length ? (
        <div className={styles.gapList}>
          {gaps.map(item => (
            <div key={item.label} className={styles.gapItem}>
              <div>
                <strong>{item.label}</strong>
                <p>Demandee dans {item.count} offre{item.count > 1 ? 's' : ''} visible{item.count > 1 ? 's' : ''}</p>
              </div>
              <span>{item.count}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <TrendingUp size={24} />
          <strong>Pas de gap evident</strong>
          <p>Tes competences couvrent les principales demandes visibles dans les offres chargees.</p>
        </div>
      )}

      {ownedInDemand.length ? (
        <div className={styles.covered}>
          <span>Deja couvert</span>
          <div>
            {ownedInDemand.map(item => <Badge key={item.label} tone="success">{item.label}</Badge>)}
          </div>
        </div>
      ) : null}

      <Button as={Link} to="/skills" variant={gaps.length ? 'primary' : 'secondary'} size="sm" icon={ArrowRight}>
        Mettre a jour les competences
      </Button>
    </Card>
  );
}

function collectDemand(opportunities) {
  const counts = new Map();

  opportunities.forEach(opportunity => {
    normaliseSkills(opportunity.skills || opportunity.required_skills || opportunity.matched_skills).forEach(skill => {
      const key = normaliseName(skill);
      if (!key) return;
      const current = counts.get(key) || { label: skill, count: 0 };
      counts.set(key, { ...current, count: current.count + 1 });
    });
  });

  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function normaliseSkills(value) {
  if (Array.isArray(value)) return value.map(String).map(item => item.trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/[,;|]/).map(item => item.trim()).filter(Boolean);
  return [];
}

function normaliseName(value) {
  return String(value || '').trim().toLowerCase();
}
