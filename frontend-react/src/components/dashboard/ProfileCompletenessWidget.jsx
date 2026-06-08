import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, FileText, Gauge, MapPin, Sparkles, UserRound } from 'lucide-react';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import styles from './ProfileCompletenessWidget.module.css';

export default function ProfileCompletenessWidget({ profile = {}, cv, skills = [], matches = [], savedCount = 0 }) {
  const items = buildCompletenessItems({ profile, cv, skills, matches, savedCount });
  const completed = items.filter(item => item.done).length;
  const score = Math.round((completed / items.length) * 100);
  const nextItem = items.find(item => !item.done);

  return (
    <Card className={styles.widget}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Profil candidat</span>
          <h2>{score}% complet</h2>
          <p>{score >= 80 ? 'Ton profil est pret pour des candidatures ciblees.' : 'Complete les points cles pour ameliorer le matching.'}</p>
        </div>
        <div className={styles.ring} style={{ '--progress': `${score * 3.6}deg` }} aria-label={`Profil complete a ${score}%`}>
          <span>{score}</span>
        </div>
      </div>

      <div className={styles.progressTrack} aria-hidden="true">
        <span style={{ width: `${score}%` }} />
      </div>

      <div className={styles.checklist}>
        {items.map(item => (
          <Link key={item.label} to={item.to} className={[styles.item, item.done ? styles.done : ''].filter(Boolean).join(' ')}>
            {item.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            <div>
              <strong>{item.label}</strong>
              <p>{item.helper}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className={styles.footer}>
        <Badge tone={score >= 80 ? 'success' : score >= 50 ? 'warning' : 'info'}>
          {completed}/{items.length} etapes
        </Badge>
        {nextItem ? (
          <Button as={Link} to={nextItem.to} size="sm" icon={nextItem.icon}>
            {nextItem.action}
          </Button>
        ) : (
          <Button as={Link} to="/opportunities" size="sm" icon={Sparkles}>
            Voir les offres
          </Button>
        )}
      </div>
    </Card>
  );
}

function buildCompletenessItems({ profile, cv, skills, matches, savedCount }) {
  const fullName = Boolean(profile.prenom || profile.nom);
  const hasContact = Boolean(profile.telephone || profile.localisation);

  return [
    {
      icon: UserRound,
      label: 'Identite renseignee',
      helper: fullName ? formatName(profile) : 'Ajoute ton nom et prenom.',
      done: fullName,
      to: '/settings',
      action: 'Completer'
    },
    {
      icon: MapPin,
      label: 'Contact et localisation',
      helper: hasContact ? profile.localisation || profile.telephone || 'Information disponible' : 'Ajoute telephone ou localisation.',
      done: hasContact,
      to: '/settings',
      action: 'Ajouter'
    },
    {
      icon: FileText,
      label: 'CV actif',
      helper: cv ? cv.fichier || cv.filename || cv.name || 'CV importe' : 'Importe un CV pour alimenter l IA.',
      done: Boolean(cv),
      to: '/cv',
      action: 'Importer'
    },
    {
      icon: Sparkles,
      label: 'Competences prioritaires',
      helper: `${skills.length}/5 competences ajoutees`,
      done: skills.length >= 5,
      to: '/skills',
      action: 'Ajouter'
    },
    {
      icon: Gauge,
      label: 'Matching lance',
      helper: matches.length ? `${matches.length} recommandation${matches.length > 1 ? 's' : ''} disponible${matches.length > 1 ? 's' : ''}` : 'Lance le matching pour classer les offres.',
      done: matches.length > 0,
      to: '/matching',
      action: 'Lancer'
    },
    {
      icon: CheckCircle2,
      label: 'Offres sauvegardees',
      helper: savedCount ? `${savedCount} offre${savedCount > 1 ? 's' : ''} sauvegardee${savedCount > 1 ? 's' : ''}` : 'Sauvegarde les pistes interessantes.',
      done: savedCount > 0,
      to: '/opportunities',
      action: 'Explorer'
    }
  ];
}

function formatName(profile) {
  return [profile.prenom, profile.nom].filter(Boolean).join(' ');
}
