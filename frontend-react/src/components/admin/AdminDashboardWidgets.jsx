import { Activity, DatabaseZap, FileWarning, UsersRound } from 'lucide-react';
import Card from '../ui/Card.jsx';
import styles from './AdminDashboardWidgets.module.css';

export default function AdminDashboardWidgets({ summary = {}, offers = [], importJobs = [], recentActivity = [] }) {
  return (
    <div className={styles.grid}>
      <AdminActivityFeed summary={summary} offers={offers} recentActivity={recentActivity} />
      <ScraperStatusWidget summary={summary} offers={offers} importJobs={importJobs} />
      <OfferQualityWidget offers={offers} />
      <UserGrowthWidget summary={summary} />
    </div>
  );
}

function AdminActivityFeed({ summary, offers, recentActivity }) {
  if (recentActivity.length) {
    return (
      <Card className={styles.widget}>
        <div className={styles.header}>
          <span><Activity size={18} />Activite recente</span>
        </div>
        <div className={styles.timeline}>
          {recentActivity.map((item, index) => (
            <div key={`${item.action}-${item.entity_id}-${item.created_at}-${index}`} className={styles.timelineItem}>
              <strong>{item.action || 'Action'}</strong>
              <p>{[item.entity_type, item.entity_id].filter(Boolean).join(' #') || 'Entite inconnue'}</p>
              <time dateTime={item.created_at || undefined}>{relativeTime(item.created_at)}</time>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const items = [
    `${Number(summary.users) || 0} utilisateurs suivis`,
    `${Number(summary.opportunities) || offers.length || 0} opportunites en base`,
    `${Number(summary.skills) || 0} competences referencees`,
    offers[0] ? `Derniere offre: ${offers[0].title || 'Sans titre'}` : 'Aucune offre recente'
  ];
  return <AdminWidget icon={Activity} title="Activite recente" items={items} />;
}

function ScraperStatusWidget({ summary, offers, importJobs }) {
  if (importJobs.length) {
    const latest = importJobs[0];
    return (
      <Card className={styles.widget}>
        <div className={styles.header}>
          <span><DatabaseZap size={18} />Scraper status</span>
        </div>
        <div className={styles.jobStatus}>
          <span className={styles.statusPill}>{latest.status || 'pending'}</span>
          <strong>{latest.source || 'Source inconnue'}</strong>
          <p>{Number(latest.imported_count) || 0} offre{Number(latest.imported_count) > 1 ? 's' : ''} importee{Number(latest.imported_count) > 1 ? 's' : ''}</p>
          <time dateTime={latest.completed_at || latest.created_at || undefined}>{formatDate(latest.completed_at || latest.created_at)}</time>
          {latest.status === 'failed' && latest.error_message ? <p className={styles.errorText}>{latest.error_message}</p> : null}
        </div>
      </Card>
    );
  }

  const sources = new Set(offers.map(item => item.source).filter(Boolean)).size;
  return <AdminWidget icon={DatabaseZap} title="Scraper status" items={[`${offers.length} offres recentes chargees`, `${sources} source${sources > 1 ? 's' : ''} detectee${sources > 1 ? 's' : ''}`, `Total imports: ${Number(summary.opportunities) || 0}`]} />;
}

function OfferQualityWidget({ offers }) {
  const incomplete = offers.filter(item => !item.title || !item.company || !item.location || !normaliseSkills(item.skills).length).length;
  return <AdminWidget icon={FileWarning} title="Qualite offres" items={[`${incomplete} offre${incomplete > 1 ? 's' : ''} incomplete${incomplete > 1 ? 's' : ''}`, `${offers.filter(item => !item.company).length} sans entreprise`, `${offers.filter(item => !item.location).length} sans lieu`]} />;
}

function UserGrowthWidget({ summary }) {
  return <AdminWidget icon={UsersRound} title="User growth" items={[`${Number(summary.users) || 0} utilisateurs`, `${Number(summary.companies) || 0} entreprises`, `${Number(summary.skills) || 0} skills`]} />;
}

function AdminWidget({ icon: Icon, title, items }) {
  return (
    <Card className={styles.widget}>
      <div className={styles.header}>
        <span><Icon size={18} />{title}</span>
      </div>
      <div className={styles.items}>
        {items.map(item => <p key={item}>{item}</p>)}
      </div>
    </Card>
  );
}

function normaliseSkills(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(/[,;|]/).map(item => item.trim()).filter(Boolean);
  return [];
}

function formatDate(value) {
  if (!value) return 'Pas encore terminee';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function relativeTime(value) {
  if (!value) return 'Date inconnue';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60]
  ];
  const formatter = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' });
  for (const [unit, seconds] of units) {
    if (Math.abs(diffSeconds) >= seconds) {
      return formatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }
  return formatter.format(diffSeconds, 'second');
}
