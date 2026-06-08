import { useMemo, useState } from 'react';
import { Building2, ExternalLink, FileWarning, MapPin, RefreshCw, Search, SlidersHorizontal, Sparkles, TrendingUp } from 'lucide-react';
import { listOpportunities } from '../../api/opportunitiesApi.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useApi } from '../../hooks/useApi.js';
import styles from './AdminOffersPage.module.css';

export default function AdminOffersPage() {
  const { data, loading, error, reload } = useApi(() => listOpportunities({ limit: 100 }), []);
  const [query, setQuery] = useState('');
  const [qualityFilter, setQualityFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const offers = data?.opportunities || [];
  const enriched = useMemo(() => offers.map(enrichOffer), [offers]);
  const stats = useMemo(() => buildStats(enriched), [enriched]);
  const sources = useMemo(() => aggregate(enriched.map(item => item.source || 'Unknown')), [enriched]);
  const companies = useMemo(() => aggregate(enriched.map(item => item.company || 'Non specifiee')).slice(0, 6), [enriched]);
  const filtered = useMemo(() => filterOffers(enriched, { query, qualityFilter, sourceFilter }), [enriched, query, qualityFilter, sourceFilter]);

  return (
    <>
      <PageHeader title="Offres admin" subtitle="Console de pilotage des opportunites importees, qualite des donnees et sources." />
      {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <LoadingState /> : (
        <div className={styles.page}>
          <section className={styles.statsGrid}>
            <StatCard icon={TrendingUp} label="Offres" value={stats.total} helper={`${stats.complete} completes`} />
            <StatCard icon={Building2} label="Entreprises" value={stats.companies} helper="dans les 100 dernieres offres" />
            <StatCard icon={FileWarning} label="A corriger" value={stats.incomplete} helper="titre, entreprise, lieu ou skills manquants" tone="warning" />
            <StatCard icon={Sparkles} label="Qualite moyenne" value={`${stats.quality}%`} helper="score de completude" />
          </section>

          <section className={styles.consoleGrid}>
            <Card className={styles.toolbar}>
              <div className={styles.searchBox}>
                <Search size={18} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher offre, entreprise, lieu, source..." />
              </div>
              <select value={qualityFilter} onChange={(event) => setQualityFilter(event.target.value)} aria-label="Filtrer par qualite">
                <option value="all">Toutes les qualites</option>
                <option value="complete">Completes</option>
                <option value="incomplete">A completer</option>
              </select>
              <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} aria-label="Filtrer par source">
                <option value="all">Toutes les sources</option>
                {sources.map(source => <option key={source.label} value={source.label}>{source.label}</option>)}
              </select>
              <Button type="button" variant="secondary" icon={RefreshCw} onClick={reload}>Refresh</Button>
            </Card>

            <Card className={styles.qualityPanel}>
              <PanelTitle icon={SlidersHorizontal} title="Qualite des offres" />
              <div className={styles.qualityList}>
                <QualityRow label="Titre" value={stats.withTitle} total={stats.total} />
                <QualityRow label="Entreprise" value={stats.withCompany} total={stats.total} />
                <QualityRow label="Lieu" value={stats.withLocation} total={stats.total} />
                <QualityRow label="Skills" value={stats.withSkills} total={stats.total} />
              </div>
            </Card>

            <Card className={styles.sourcePanel}>
              <PanelTitle icon={ExternalLink} title="Sources" />
              <div className={styles.sourceList}>
                {sources.slice(0, 6).map(source => (
                  <button key={source.label} type="button" className={sourceFilter === source.label ? styles.activeSource : ''} onClick={() => setSourceFilter(source.label)}>
                    <span>{source.label}</span>
                    <strong>{source.count}</strong>
                  </button>
                ))}
              </div>
            </Card>

            <Card className={styles.companyPanel}>
              <PanelTitle icon={Building2} title="Top entreprises" />
              <div className={styles.companyList}>
                {companies.map(company => (
                  <span key={company.label}>{company.label}<strong>{company.count}</strong></span>
                ))}
              </div>
            </Card>
          </section>

          <Card className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <div>
                <h2>Inventaire offres</h2>
                <p>{filtered.length} offre{filtered.length > 1 ? 's' : ''} affichee{filtered.length > 1 ? 's' : ''}</p>
              </div>
              <Badge tone={stats.incomplete ? 'warning' : 'success'}>{stats.incomplete ? `${stats.incomplete} a completer` : 'Clean'}</Badge>
            </div>
            <DataTable rows={filtered} columns={columns} emptyMessage="Aucune offre ne correspond aux filtres." />
          </Card>
        </div>
      )}
    </>
  );
}

const columns = [
  {
    key: 'title',
    header: 'Offre',
    render: (row) => (
      <div className={styles.offerCell}>
        <strong>{row.title || 'Sans titre'}</strong>
        <span>{row.description || 'Description indisponible'}</span>
      </div>
    )
  },
  {
    key: 'company',
    header: 'Entreprise',
    render: (row) => <span className={styles.meta}><Building2 size={15} />{row.company || 'Non specifiee'}</span>
  },
  {
    key: 'location',
    header: 'Lieu',
    render: (row) => <span className={styles.meta}><MapPin size={15} />{row.location || 'Non specifie'}</span>
  },
  {
    key: 'quality',
    header: 'Qualite',
    render: (row) => <QualityBadge offer={row} />
  },
  {
    key: 'source',
    header: 'Source',
    render: (row) => row.source_url ? (
      <a className={styles.sourceLink} href={row.source_url} target="_blank" rel="noreferrer">{row.source || 'Source'}<ExternalLink size={14} /></a>
    ) : <Badge tone="neutral">{row.source || 'Unknown'}</Badge>
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

function QualityRow({ label, value, total }) {
  const percent = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className={styles.qualityRow}>
      <div><span>{label}</span><strong>{percent}%</strong></div>
      <i><b style={{ width: `${percent}%` }} /></i>
    </div>
  );
}

function QualityBadge({ offer }) {
  const tone = offer.qualityScore >= 80 ? 'success' : offer.qualityScore >= 50 ? 'warning' : 'danger';
  return <Badge tone={tone}>{offer.qualityScore}%</Badge>;
}

function enrichOffer(offer) {
  const skills = normaliseSkills(offer.skills);
  const checks = [
    Boolean(offer.title),
    Boolean(offer.company),
    Boolean(offer.location),
    skills.length > 0,
    Boolean(offer.source || offer.source_url)
  ];
  return {
    ...offer,
    skills,
    qualityScore: Math.round((checks.filter(Boolean).length / checks.length) * 100),
    complete: checks.slice(0, 4).every(Boolean)
  };
}

function buildStats(offers) {
  const total = offers.length;
  const withTitle = offers.filter(item => item.title).length;
  const withCompany = offers.filter(item => item.company).length;
  const withLocation = offers.filter(item => item.location).length;
  const withSkills = offers.filter(item => item.skills.length).length;
  const complete = offers.filter(item => item.complete).length;
  const quality = total ? Math.round(offers.reduce((sum, item) => sum + item.qualityScore, 0) / total) : 0;
  return {
    total,
    withTitle,
    withCompany,
    withLocation,
    withSkills,
    complete,
    incomplete: total - complete,
    companies: new Set(offers.map(item => item.company).filter(Boolean)).size,
    quality
  };
}

function filterOffers(offers, filters) {
  const term = filters.query.trim().toLowerCase();
  return offers.filter(offer => {
    const haystack = `${offer.title || ''} ${offer.company || ''} ${offer.location || ''} ${offer.source || ''}`.toLowerCase();
    const matchesQuery = !term || haystack.includes(term);
    const matchesQuality = filters.qualityFilter === 'all'
      || (filters.qualityFilter === 'complete' && offer.complete)
      || (filters.qualityFilter === 'incomplete' && !offer.complete);
    const matchesSource = filters.sourceFilter === 'all' || (offer.source || 'Unknown') === filters.sourceFilter;
    return matchesQuery && matchesQuality && matchesSource;
  });
}

function aggregate(values) {
  const counts = values.reduce((map, value) => map.set(value, (map.get(value) || 0) + 1), new Map());
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function normaliseSkills(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') return value.split(/[,;|]/).map(item => item.trim()).filter(Boolean);
  return [];
}
