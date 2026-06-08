import { AlertTriangle, ArrowUpRight, CheckCircle2, Target, TrendingUp } from 'lucide-react';
import Badge from '../ui/Badge.jsx';
import Card from '../ui/Card.jsx';
import SkillLevelBar from './SkillLevelBar.jsx';
import styles from './CompetencyProgressionWidget.module.css';

export default function CompetencyProgressionWidget({ skills = [] }) {
  const progression = buildProgression(skills);

  return (
    <Card className={styles.widget}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Progression competences</span>
          <h2>{progression.average}%</h2>
          <p>{progression.message}</p>
        </div>
        <div className={styles.ring} style={{ '--progress': `${progression.average * 3.6}deg` }}>
          <TrendingUp size={22} />
          <strong>{progression.average}</strong>
        </div>
      </div>

      <div className={styles.stageRail} aria-label="Niveaux de progression">
        {progression.stages.map(stage => (
          <div key={stage.label} className={[styles.stage, stage.active ? styles.active : ''].filter(Boolean).join(' ')}>
            <span>{stage.label}</span>
            <strong>{stage.range}</strong>
          </div>
        ))}
      </div>

      <div className={styles.contentGrid}>
        <section className={styles.priority}>
          <div className={styles.sectionTitle}>
            <AlertTriangle size={17} />
            <span>Priorites a ameliorer</span>
          </div>
          <div className={styles.skillList}>
            {progression.priorities.length ? progression.priorities.map(skill => (
              <div key={skill.id || skill.name} className={styles.skillItem}>
                <div>
                  <strong>{skill.name}</strong>
                  <p>Objectif suivant: {skill.nextTarget}% · +{skill.delta} points</p>
                </div>
                <SkillLevelBar score={skill.score} showValue size="sm" />
              </div>
            )) : (
              <div className={styles.empty}>
                <CheckCircle2 size={20} />
                <p>Aucune competence faible. Continue a maintenir les acquis.</p>
              </div>
            )}
          </div>
        </section>

        <section className={styles.plan}>
          <div className={styles.sectionTitle}>
            <Target size={17} />
            <span>Plan de progression</span>
          </div>
          <div className={styles.actions}>
            {progression.actions.map(action => (
              <div key={action.title} className={styles.action}>
                <ArrowUpRight size={16} />
                <div>
                  <strong>{action.title}</strong>
                  <p>{action.text}</p>
                </div>
                <Badge tone={action.tone}>{action.badge}</Badge>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Card>
  );
}

function buildProgression(skills) {
  const list = skills.map(normaliseSkill).filter(skill => skill.name);
  const average = list.length ? Math.round(list.reduce((sum, skill) => sum + skill.score, 0) / list.length) : 0;
  const priorities = [...list].filter(skill => skill.score < 80).sort((a, b) => a.score - b.score).slice(0, 4).map(skill => {
    const nextTarget = skill.score < 60 ? 60 : 80;
    return { ...skill, nextTarget, delta: Math.max(1, nextTarget - skill.score) };
  });

  const stages = [
    { label: 'Base', range: '0-59', active: average < 60 },
    { label: 'Solide', range: '60-79', active: average >= 60 && average < 80 },
    { label: 'Maitrise', range: '80-100', active: average >= 80 }
  ];

  return {
    average,
    priorities,
    stages,
    message: list.length ? getMessage(average, priorities.length) : 'Ajoute tes premieres competences pour commencer la progression.',
    actions: buildActions(list, priorities)
  };
}

function buildActions(skills, priorities) {
  if (!skills.length) {
    return [
      { title: 'Ajouter 5 competences', text: 'Commence par les skills les plus importants pour ton objectif.', badge: 'Start', tone: 'info' },
      { title: 'Donner un score initial', text: 'Utilise le slider pour indiquer ton niveau actuel.', badge: '0%', tone: 'neutral' }
    ];
  }

  const weak = skills.filter(skill => skill.score < 60).length;
  const strong = skills.filter(skill => skill.score >= 80).length;
  const firstPriority = priorities[0];

  return [
    {
      title: firstPriority ? `Monter ${firstPriority.name}` : 'Maintenir les competences fortes',
      text: firstPriority ? `Passe de ${firstPriority.score}% a ${firstPriority.nextTarget}% avec un mini-projet ou exercice cible.` : 'Relie tes competences maitrisees aux offres prioritaires.',
      badge: firstPriority ? `+${firstPriority.delta}` : `${strong} fortes`,
      tone: firstPriority ? 'warning' : 'success'
    },
    {
      title: 'Reduire les points faibles',
      text: weak ? `${weak} competence${weak > 1 ? 's' : ''} sous 60%. Priorise-les avant de lancer un nouveau matching.` : 'Aucune competence sous 60%. Vise maintenant la maitrise.',
      badge: weak ? `${weak} weak` : 'OK',
      tone: weak ? 'warning' : 'success'
    },
    {
      title: 'Mettre a jour chaque semaine',
      text: 'Ajuste les scores apres formation, projet, certification ou pratique reelle.',
      badge: 'Routine',
      tone: 'info'
    }
  ];
}

function normaliseSkill(skill) {
  const score = Math.max(0, Math.min(100, Number(skill.score ?? skill.demand ?? 0) || 0));
  return {
    id: skill.id_skill || skill.id || skill.nom || skill.name,
    name: skill.nom || skill.name || '',
    category: skill.categorie || skill.category || 'General',
    score
  };
}

function getMessage(average, priorityCount) {
  if (average >= 80) return 'Tres bon niveau global. Concentre-toi sur la preuve: projets, certifications et offres ciblees.';
  if (average >= 60) return `${priorityCount} competence${priorityCount > 1 ? 's' : ''} a pousser vers la maitrise.`;
  return 'Le profil a besoin de renforcer ses bases avant un matching optimal.';
}
