import { useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Layers3, RefreshCw, Search, Sparkles, Target, TrendingUp } from 'lucide-react';
import { getPanelSkills } from '../../api/adminApi.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import SkillLevelBar from '../../components/skills/SkillLevelBar.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useApi } from '../../hooks/useApi.js';
import styles from './AdminSkillsPage.module.css';

export default function AdminSkillsPage() {
  const { data, loading, error, reload } = useApi(getPanelSkills, []);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const skills = useMemo(() => (data || []).map(enrichSkill), [data]);
  const stats = useMemo(() => buildStats(skills), [skills]);
  const categories = useMemo(() => aggregate(skills.map(item => item.category || 'General')), [skills]);
  const filtered = useMemo(() => filterSkills(skills, { query, categoryFilter, priorityFilter }), [skills, query, categoryFilter, priorityFilter]);

  return (
    <>
      <PageHeader title="Skills admin" subtitle="Pilotage de la taxonomie competences, demande marche et priorites de matching." />
      {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <LoadingState /> : (
        <div className={styles.page}>
          <section className={styles.statsGrid}>
            <StatCard icon={Layers3} label="Competences" value={stats.total} helper={`${stats.categories} categories`} />
            <StatCard icon={TrendingUp} label="Demande moyenne" value={stats.averageDemand} helper="score marche" />
            <StatCard icon={Target} label="Priorite haute" value={stats.highPriority} helper="skills a surveiller" tone="warning" />
            <StatCard icon={AlertTriangle} label="Sans categorie" value={stats.uncategorized} helper="taxonomy cleanup" tone="danger" />
          </section>

          <section className={styles.consoleGrid}>
            <Card className={styles.toolbar}>
              <div className={styles.searchBox}>
                <Search size={18} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher skill, categorie, priorite..." />
              </div>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filtrer par categorie">
                <option value="all">Toutes les categories</option>
                {categories.map(category => <option key={category.label} value={category.label}>{category.label}</option>)}
              </select>
              <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} aria-label="Filtrer par priorite">
                <option value="all">Toutes les priorites</option>
                <option value="high">Haute</option>
                <option value="medium">Moyenne</option>
                <option value="low">Basse</option>
              </select>
              <Button type="button" variant="secondary" icon={RefreshCw} onClick={reload}>Refresh</Button>
            </Card>

            <Card className={styles.demandPanel}>
              <PanelTitle icon={BarChart3} title="Distribution demande" />
              <DemandRow label="Forte" value={stats.strongDemand} total={stats.total} tone="strong" />
              <DemandRow label="Moyenne" value={stats.mediumDemand} total={stats.total} tone="medium" />
              <DemandRow label="Faible" value={stats.lowDemand} total={stats.total} tone="low" />
            </Card>

            <Card className={styles.categoryPanel}>
              <PanelTitle icon={Layers3} title="Categories" />
              <div className={styles.categoryList}>
                {categories.slice(0, 8).map(category => (
                  <button key={category.label} type="button" className={categoryFilter === category.label ? styles.activeCategory : ''} onClick={() => setCategoryFilter(category.label)}>
                    <span>{category.label}</span>
                    <strong>{category.count}</strong>
                  </button>
                ))}
              </div>
            </Card>

            <Card className={styles.priorityPanel}>
              <PanelTitle icon={Sparkles} title="Priorites matching" />
              <div className={styles.priorityList}>
                {skills.filter(item => item.priorityLevel === 'high').slice(0, 5).map(skill => (
                  <div key={skill.id || skill.name}>
                    <strong>{skill.name}</strong>
                    <Badge tone="warning">{skill.demand}% demande</Badge>
                  </div>
                ))}
                {!stats.highPriority ? <p>Aucune priorite haute detectee.</p> : null}
              </div>
            </Card>
          </section>

          <Card className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <div>
                <h2>Inventaire competences</h2>
                <p>{filtered.length} competence{filtered.length > 1 ? 's' : ''} affichee{filtered.length > 1 ? 's' : ''}</p>
              </div>
              <Badge tone="info">{stats.total} total</Badge>
            </div>
            <DataTable rows={filtered} columns={columns} emptyMessage="Aucune competence ne correspond aux filtres." />
          </Card>
        </div>
      )}
    </>
  );
}

const columns = [
  {
    key: 'name',
    header: 'Competence',
    render: (row) => (
      <div className={styles.skillCell}>
        <strong>{row.name}</strong>
        <span>{row.category || 'General'}</span>
      </div>
    )
  },
  {
    key: 'demand',
    header: 'Demande',
    render: (row) => (
      <div className={styles.demandCell}>
        <SkillLevelBar score={row.demand} showValue />
      </div>
    )
  },
  {
    key: 'trend',
    header: 'Tendance',
    render: (row) => <SkillLevelBar score={row.trend} />
  },
  {
    key: 'priority',
    header: 'Priorite',
    render: (row) => <PriorityBadge level={row.priorityLevel} />
  },
  {
    key: 'quality',
    header: 'Qualite',
    render: (row) => <Badge tone={row.category === 'General' ? 'warning' : 'success'}>{row.category === 'General' ? 'A classer' : 'OK'}</Badge>
  }
];

function StatCard({ icon: Icon, label, value, helper, tone }) {
  return (
    <Card className={[styles.stat, tone ? styles[tone] : ''].filter(Boolean).join(' ')}>
      <Icon size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </Card>
  );
}

function PanelTitle({ icon: Icon, title }) {
  return <div className={styles.panelTitle}><Icon size={18} /><span>{title}</span></div>;
}

function DemandRow({ label, value, total, tone }) {
  const percent = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className={styles.demandRow}>
      <div><span>{label}</span><strong>{value}</strong></div>
      <i className={styles[tone]}><b style={{ width: `${percent}%` }} /></i>
    </div>
  );
}

function PriorityBadge({ level }) {
  const tone = level === 'high' ? 'warning' : level === 'medium' ? 'info' : 'neutral';
  const label = level === 'high' ? 'Haute' : level === 'medium' ? 'Moyenne' : 'Basse';
  return <Badge tone={tone}>{label}</Badge>;
}

function enrichSkill(skill) {
  const demand = clampScore(skill.demand ?? skill.score ?? skill.usage_count ?? 0);
  const trend = clampScore(skill.trend ?? demand);
  const rawPriority = String(skill.priority || '').toLowerCase();
  const priorityLevel = rawPriority.includes('high') || rawPriority.includes('haute') || demand >= 75
    ? 'high'
    : rawPriority.includes('medium') || rawPriority.includes('moy') || demand >= 45 ? 'medium' : 'low';
  return {
    ...skill,
    id: skill.id_skill || skill.id || skill.name || skill.nom,
    name: skill.name || skill.nom || 'Skill sans nom',
    category: skill.category || skill.categorie || 'General',
    demand,
    trend,
    priorityLevel
  };
}

function buildStats(skills) {
  const total = skills.length;
  const averageDemand = total ? Math.round(skills.reduce((sum, item) => sum + item.demand, 0) / total) : 0;
  return {
    total,
    averageDemand,
    categories: new Set(skills.map(item => item.category).filter(Boolean)).size,
    highPriority: skills.filter(item => item.priorityLevel === 'high').length,
    uncategorized: skills.filter(item => item.category === 'General').length,
    strongDemand: skills.filter(item => item.demand >= 75).length,
    mediumDemand: skills.filter(item => item.demand >= 45 && item.demand < 75).length,
    lowDemand: skills.filter(item => item.demand < 45).length
  };
}

function filterSkills(skills, filters) {
  const term = filters.query.trim().toLowerCase();
  return skills.filter(skill => {
    const haystack = `${skill.name} ${skill.category} ${skill.priorityLevel}`.toLowerCase();
    const matchesTerm = !term || haystack.includes(term);
    const matchesCategory = filters.categoryFilter === 'all' || skill.category === filters.categoryFilter;
    const matchesPriority = filters.priorityFilter === 'all' || skill.priorityLevel === filters.priorityFilter;
    return matchesTerm && matchesCategory && matchesPriority;
  });
}

function aggregate(values) {
  const counts = values.reduce((map, value) => map.set(value, (map.get(value) || 0) + 1), new Map());
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}
