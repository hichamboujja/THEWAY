import { AlertTriangle, CheckCircle2, Plus, Save, Search, Target, Trash2, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createSkill, deleteSkill, updateSkill } from '../../api/skillsApi.js';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import DataTable from '../ui/DataTable.jsx';
import SkillLevelBar from './SkillLevelBar.jsx';
import styles from './SkillEditor.module.css';

function getSkillId(skill) {
  return skill.id_skill || skill.id;
}

function getSkillName(skill) {
  return skill.nom || skill.name || '';
}

function getSkillCategory(skill) {
  return skill.categorie || skill.category || 'General';
}

function getSkillScore(skill) {
  return Math.max(0, Math.min(100, Number(skill.score ?? skill.demand ?? 0) || 0));
}

function getLevelLabel(score) {
  if (score < 60) return 'A renforcer';
  if (score < 80) return 'Solide';
  return 'Maitrise';
}

function getRecommendation(skill, score) {
  if (score >= 80) return 'Conserver le niveau et lier aux offres prioritaires.';
  if (score >= 60) return 'Pratiquer sur un cas concret pour passer au niveau superieur.';
  return `Priorite: viser 60% avec un projet court en ${getSkillName(skill) || 'cette competence'}.`;
}

export default function SkillEditor({ skills, onChanged }) {
  const [form, setForm] = useState({ nom: '', categorie: '', niveau: '', score: 50 });
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    setDrafts(Object.fromEntries((skills || []).map((skill) => {
      const id = getSkillId(skill);
      return [id, { niveau: skill.niveau || '', score: getSkillScore(skill) }];
    }).filter(([id]) => id)));
  }, [skills]);

  const stats = useMemo(() => {
    const list = skills || [];
    const scores = list.map(getSkillScore);
    const average = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
    const weak = scores.filter((score) => score < 60).length;
    const strong = scores.filter((score) => score >= 80).length;
    const categories = new Set(list.map(getSkillCategory));
    return { average, weak, strong, categories: categories.size };
  }, [skills]);

  const filteredSkills = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (skills || []).filter((skill) => {
      const score = getSkillScore(skill);
      const matchesTerm = !term || `${getSkillName(skill)} ${getSkillCategory(skill)} ${skill.niveau || ''}`.toLowerCase().includes(term);
      const matchesFilter = filter === 'all' || (filter === 'weak' && score < 60) || (filter === 'solid' && score >= 60 && score < 80) || (filter === 'strong' && score >= 80);
      return matchesTerm && matchesFilter;
    });
  }, [skills, query, filter]);

  async function addSkill(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await createSkill({ ...form, score: Number(form.score) });
      setForm({ nom: '', categorie: '', niveau: '', score: 50 });
      onChanged?.();
    } finally {
      setLoading(false);
    }
  }

  async function removeSkill(skill) {
    const id = getSkillId(skill);
    if (!id) return;
    await deleteSkill(id);
    onChanged?.();
  }

  async function saveSkill(skill) {
    const id = getSkillId(skill);
    if (!id) return;
    const draft = drafts[id] || { niveau: skill.niveau || '', score: getSkillScore(skill) };
    setSavingId(id);
    try {
      await updateSkill(id, { niveau: draft.niveau, score: Number(draft.score) });
      onChanged?.();
    } finally {
      setSavingId(null);
    }
  }

  function updateDraft(skill, patch) {
    const id = getSkillId(skill);
    setDrafts((current) => ({
      ...current,
      [id]: { niveau: skill.niveau || '', score: getSkillScore(skill), ...(current[id] || {}), ...patch }
    }));
  }

  const columns = [
    {
      key: 'nom',
      header: 'Competence',
      render: (row) => {
        const score = getSkillScore(row);
        return (
          <div className={styles.skillName}>
            <strong>{getSkillName(row)}</strong>
            <span className={score < 60 ? styles.weakText : ''}>{getLevelLabel(score)}</span>
          </div>
        );
      }
    },
    { key: 'categorie', header: 'Categorie', render: (row) => <span className={styles.category}>{getSkillCategory(row)}</span> },
    {
      key: 'niveau',
      header: 'Niveau',
      render: (row) => {
        const id = getSkillId(row);
        return (
          <input
            className={styles.inlineInput}
            value={drafts[id]?.niveau ?? row.niveau ?? ''}
            onChange={(event) => updateDraft(row, { niveau: event.target.value })}
            placeholder="debutant, avance..."
          />
        );
      }
    },
    {
      key: 'score',
      header: 'Pourcentage',
      render: (row) => {
        const id = getSkillId(row);
        const value = drafts[id]?.score ?? getSkillScore(row);
        return (
          <div className={styles.scoreEditor}>
            <SkillLevelBar score={value} showValue />
            <input
              aria-label={`Modifier ${getSkillName(row)}`}
              className={styles.range}
              type="range"
              min="0"
              max="100"
              value={value}
              onChange={(event) => updateDraft(row, { score: event.target.value })}
            />
            <p className={value < 60 ? styles.recommendationWeak : styles.recommendation}>{getRecommendation(row, Number(value))}</p>
          </div>
        );
      }
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className={styles.actions}>
          <Button variant="secondary" size="sm" icon={Save} loading={savingId === getSkillId(row)} onClick={() => saveSkill(row)}>Enregistrer</Button>
          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => removeSkill(row)}>Supprimer</Button>
        </div>
      )
    }
  ];

  return (
    <div className={styles.page}>
      <section className={styles.stats} aria-label="Synthese competences">
        <div className={styles.stat}><TrendingUp size={18} aria-hidden="true" /><span>Moyenne</span><strong>{stats.average}%</strong></div>
        <div className={styles.stat}><AlertTriangle size={18} aria-hidden="true" /><span>A renforcer</span><strong>{stats.weak}</strong></div>
        <div className={styles.stat}><CheckCircle2 size={18} aria-hidden="true" /><span>Maitrise</span><strong>{stats.strong}</strong></div>
        <div className={styles.stat}><Target size={18} aria-hidden="true" /><span>Categories</span><strong>{stats.categories}</strong></div>
      </section>

      <div className={styles.grid}>
        <Card>
          <form className={styles.form} onSubmit={addSkill}>
            <div>
              <h2>Nouvelle competence</h2>
              <p>Score initial et niveau visible dans le matching.</p>
            </div>
            <label>Nom<input value={form.nom} onChange={(event) => setForm({ ...form, nom: event.target.value })} required /></label>
            <label>Categorie<input value={form.categorie} onChange={(event) => setForm({ ...form, categorie: event.target.value })} /></label>
            <label>Niveau<input value={form.niveau} onChange={(event) => setForm({ ...form, niveau: event.target.value })} placeholder="debutant, avance..." /></label>
            <label>
              Score
              <div className={styles.formScore}>
                <input type="range" min="0" max="100" value={form.score} onChange={(event) => setForm({ ...form, score: event.target.value })} />
                <strong>{form.score}%</strong>
              </div>
            </label>
            <Button type="submit" icon={Plus} loading={loading}>Ajouter</Button>
          </form>
        </Card>

        <div className={styles.list}>
          <div className={styles.toolbar}>
            <label className={styles.search}>
              <Search size={16} aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une competence" />
            </label>
            <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filtrer les competences">
              <option value="all">Toutes</option>
              <option value="weak">A renforcer</option>
              <option value="solid">Solides</option>
              <option value="strong">Maitrisees</option>
            </select>
          </div>
          <DataTable columns={columns} rows={filteredSkills} emptyMessage="Aucune competence enregistree." />
        </div>
      </div>
    </div>
  );
}
