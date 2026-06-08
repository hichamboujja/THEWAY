import { Activity, DatabaseZap, FileWarning, UsersRound } from 'lucide-react';
import Card from '../ui/Card.jsx';
import styles from './AdminDashboardWidgets.module.css';

export default function AdminDashboardWidgets({ summary = {}, offers = [] }) {
  return (
    <div className={styles.grid}>
      <AdminActivityFeed summary={summary} offers={offers} />
      <ScraperStatusWidget summary={summary} offers={offers} />
      <OfferQualityWidget offers={offers} />
      <UserGrowthWidget summary={summary} />
    </div>
  );
}

function AdminActivityFeed({ summary, offers }) {
  const items = [
    `${Number(summary.users) || 0} utilisateurs suivis`,
    `${Number(summary.opportunities) || offers.length || 0} opportunites en base`,
    `${Number(summary.skills) || 0} competences referencees`,
    offers[0] ? `Derniere offre: ${offers[0].title || 'Sans titre'}` : 'Aucune offre recente'
  ];
  return <AdminWidget icon={Activity} title="Activite recente" items={items} />;
}

function ScraperStatusWidget({ summary, offers }) {
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
