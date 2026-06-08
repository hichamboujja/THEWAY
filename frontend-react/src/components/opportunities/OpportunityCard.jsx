import { Link } from 'react-router-dom';
import { ArrowRight, Building2, ExternalLink, MapPin, Sparkles } from 'lucide-react';
import Badge from '../ui/Badge.jsx';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import OpportunityApplyButton from './OpportunityApplyButton.jsx';
import OpportunityBookmarkButton from './OpportunityBookmarkButton.jsx';
import styles from './OpportunityCard.module.css';

export default function OpportunityCard({ opportunity, onSaved }) {
  const id = opportunity.id || opportunity.uid || opportunity.opportunity_id;
  const score = scoreOf(opportunity);
  const skills = normaliseSkills(opportunity.skills || opportunity.required_skills || opportunity.matched_skills);
  const missingSkills = normaliseSkills(opportunity.missing_skills || opportunity.gaps).slice(0, 3);
  const company = opportunity.company || opportunity.entreprise || 'Entreprise non specifiee';
  const location = opportunity.location || opportunity.localisation || 'Localisation non specifiee';

  return (
    <Card className={styles.card} as="article">
      <div className={styles.top}>
        <div className={styles.identity}>
          <Link to={id ? `/opportunities/${id}` : '/opportunities'} className={styles.title}>{opportunity.title || 'Opportunite sans titre'}</Link>
          <p><Building2 size={15} />{company}</p>
          <p><MapPin size={15} />{location}</p>
        </div>
        <div className={styles.scoreBlock}>
          <div className={[styles.score, score ? styles.hasScore : ''].filter(Boolean).join(' ')}>
            <Sparkles size={14} />
            <strong>{score || '--'}</strong>
          </div>
          <span>{score ? 'match' : 'offre'}</span>
        </div>
      </div>

      <p className={styles.description}>{opportunity.description || 'Description indisponible.'}</p>

      <div className={styles.skills}>
        {skills.slice(0, 5).map((skill) => <Badge key={skill} tone="info">{skill}</Badge>)}
        {!skills.length ? <span className={styles.muted}>Aucune competence listee</span> : null}
      </div>

      {missingSkills.length ? (
        <div className={styles.gaps}>
          <span>A renforcer</span>
          {missingSkills.map(skill => <Badge key={skill} tone="warning">{skill}</Badge>)}
        </div>
      ) : null}

      <div className={styles.actions}>
        <OpportunityBookmarkButton opportunity={opportunity} onSaved={onSaved} />
        <OpportunityApplyButton opportunity={opportunity} />
        {id ? <Button as={Link} to={`/opportunities/${id}`} variant="secondary" icon={ArrowRight}>Details</Button> : null}
      </div>

      {opportunity.source_url ? (
        <a className={styles.source} href={opportunity.source_url} target="_blank" rel="noreferrer">
          Source {opportunity.source || ''}<ExternalLink size={14} />
        </a>
      ) : null}
    </Card>
  );
}

function scoreOf(opportunity) {
  const score = Number(opportunity.score || opportunity.match_score || opportunity.matchScore || opportunity.compatibility);
  if (!Number.isFinite(score) || score <= 0) return 0;
  return Math.round(score > 1 ? score : score * 100);
}

function normaliseSkills(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') {
    return value.split(/[,;|]/).map(item => item.trim()).filter(Boolean);
  }
  return [];
}
