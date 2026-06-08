import { MapPin, Puzzle, Sparkles, Target } from 'lucide-react';
import Badge from '../ui/Badge.jsx';
import styles from './MatchingExplainabilityWidget.module.css';

export default function MatchingExplainabilityWidget({ result = {} }) {
  const opportunity = result.opportunity || result;
  const matched = normaliseSkills(result.matched_skills || result.matchedSkills || opportunity.skills).slice(0, 4);
  const missing = normaliseSkills(result.missing_skills || result.missingSkills || result.gaps).slice(0, 4);
  const locationFit = Boolean(opportunity.location || result.location);
  const explanation = result.explanation || result.resume || result.summary || 'Matching calcule a partir du profil, des competences et de l offre.';

  return (
    <div className={styles.box}>
      <div className={styles.reason}>
        <Sparkles size={16} />
        <p>{explanation}</p>
      </div>
      <div className={styles.grid}>
        <Signal icon={Target} label="Skills match" items={matched} empty="Aucun skill detaille" tone="success" />
        <Signal icon={Puzzle} label="Skills manquants" items={missing} empty="Aucun gap liste" tone="warning" />
        <Signal icon={MapPin} label="Location fit" items={[locationFit ? opportunity.location || result.location : 'Non specifie']} tone={locationFit ? 'info' : 'neutral'} />
      </div>
    </div>
  );
}

function Signal({ icon: Icon, label, items = [], empty, tone }) {
  return (
    <div className={styles.signal}>
      <span><Icon size={14} />{label}</span>
      <div>
        {items.length ? items.map(item => <Badge key={item} tone={tone}>{item}</Badge>) : <Badge tone="neutral">{empty}</Badge>}
      </div>
    </div>
  );
}

function normaliseSkills(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') return value.split(/[,;|]/).map(item => item.trim()).filter(Boolean);
  return [];
}
