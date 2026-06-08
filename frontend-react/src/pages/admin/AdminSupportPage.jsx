import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Inbox, Mail, RefreshCw, Search, ShieldAlert, UserRound } from 'lucide-react';
import { getSupportTickets } from '../../api/adminApi.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useApi } from '../../hooks/useApi.js';
import styles from './AdminSupportPage.module.css';

export default function AdminSupportPage() {
  const { data, loading, error, reload } = useApi(getSupportTickets, []);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const tickets = useMemo(() => (data || []).map(enrichTicket), [data]);
  const stats = useMemo(() => buildStats(tickets), [tickets]);
  const filtered = useMemo(() => filterTickets(tickets, { query, statusFilter, priorityFilter }), [tickets, query, statusFilter, priorityFilter]);
  const urgent = tickets.filter(ticket => ticket.priorityLevel === 'high' || ticket.statusLevel === 'open').slice(0, 5);

  return (
    <>
      <PageHeader title="Support admin" subtitle="Inbox support, priorisation des tickets et suivi des demandes utilisateurs." />
      {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <LoadingState /> : (
        <div className={styles.page}>
          <section className={styles.statsGrid}>
            <StatCard icon={Inbox} label="Tickets" value={stats.total} helper={`${stats.open} ouverts`} />
            <StatCard icon={ShieldAlert} label="Urgents" value={stats.highPriority} helper="haute priorite" tone="danger" />
            <StatCard icon={Clock3} label="En attente" value={stats.pending} helper="pending / waiting" tone="warning" />
            <StatCard icon={CheckCircle2} label="Resolus" value={stats.resolved} helper="closed / resolved" />
          </section>

          <section className={styles.consoleGrid}>
            <Card className={styles.toolbar}>
              <div className={styles.searchBox}>
                <Search size={18} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher sujet, message, email, utilisateur..." />
              </div>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrer par statut">
                <option value="all">Tous les statuts</option>
                <option value="open">Ouverts</option>
                <option value="pending">En attente</option>
                <option value="resolved">Resolus</option>
              </select>
              <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} aria-label="Filtrer par priorite">
                <option value="all">Toutes priorites</option>
                <option value="high">Haute</option>
                <option value="normal">Normale</option>
                <option value="low">Basse</option>
              </select>
              <Button type="button" variant="secondary" icon={RefreshCw} onClick={reload}>Refresh</Button>
            </Card>

            <Card className={styles.inboxPanel}>
              <PanelTitle icon={Inbox} title="Inbox prioritaire" />
              <div className={styles.ticketStack}>
                {urgent.length ? urgent.map(ticket => (
                  <div key={ticket.id} className={styles.ticketPreview}>
                    <div>
                      <strong>{ticket.subject || 'Sans sujet'}</strong>
                      <p>{ticket.user || ticket.email || 'Utilisateur inconnu'}</p>
                    </div>
                    <PriorityBadge level={ticket.priorityLevel} />
                  </div>
                )) : <p className={styles.empty}>Aucun ticket prioritaire.</p>}
              </div>
            </Card>

            <Card className={styles.statusPanel}>
              <PanelTitle icon={Clock3} title="Statuts" />
              <StatusRow label="Ouverts" value={stats.open} total={stats.total} tone="danger" />
              <StatusRow label="En attente" value={stats.pending} total={stats.total} tone="warning" />
              <StatusRow label="Resolus" value={stats.resolved} total={stats.total} tone="success" />
            </Card>

            <Card className={styles.loadPanel}>
              <PanelTitle icon={UserRound} title="Charge support" />
              <div className={styles.loadGrid}>
                <LoadMetric label="Avec email" value={stats.withEmail} />
                <LoadMetric label="Sans message" value={stats.withoutMessage} />
                <LoadMetric label="Aujourd'hui" value={stats.today} />
              </div>
            </Card>
          </section>

          <Card className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <div>
                <h2>Tickets support</h2>
                <p>{filtered.length} ticket{filtered.length > 1 ? 's' : ''} affiche{filtered.length > 1 ? 's' : ''}</p>
              </div>
              <Badge tone={stats.highPriority ? 'danger' : 'success'}>{stats.highPriority ? `${stats.highPriority} urgent` : 'Stable'}</Badge>
            </div>
            <DataTable rows={filtered} columns={columns} emptyMessage="Aucun ticket ne correspond aux filtres." />
          </Card>
        </div>
      )}
    </>
  );
}

const columns = [
  {
    key: 'subject',
    header: 'Ticket',
    render: (row) => (
      <div className={styles.subjectCell}>
        <strong>{row.subject || 'Sans sujet'}</strong>
        <span>{row.message || 'Aucun message detaille'}</span>
      </div>
    )
  },
  {
    key: 'user',
    header: 'Utilisateur',
    render: (row) => (
      <div className={styles.userCell}>
        <UserRound size={15} />
        <div>
          <strong>{row.user || 'Utilisateur inconnu'}</strong>
          <span>{row.email || 'Email indisponible'}</span>
        </div>
      </div>
    )
  },
  {
    key: 'priority',
    header: 'Priorite',
    render: (row) => <PriorityBadge level={row.priorityLevel} />
  },
  {
    key: 'status',
    header: 'Statut',
    render: (row) => <StatusBadge level={row.statusLevel} />
  },
  {
    key: 'updated_at',
    header: 'MAJ',
    render: (row) => <span className={styles.dateText}>{formatDate(row.updated_at || row.created_at)}</span>
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

function StatusRow({ label, value, total, tone }) {
  const percent = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className={styles.statusRow}>
      <div><span>{label}</span><strong>{value}</strong></div>
      <i className={styles[tone]}><b style={{ width: `${percent}%` }} /></i>
    </div>
  );
}

function LoadMetric({ label, value }) {
  return <div className={styles.loadMetric}><span>{label}</span><strong>{value}</strong></div>;
}

function PriorityBadge({ level }) {
  const tone = level === 'high' ? 'danger' : level === 'low' ? 'neutral' : 'warning';
  const label = level === 'high' ? 'Haute' : level === 'low' ? 'Basse' : 'Normale';
  return <Badge tone={tone}>{label}</Badge>;
}

function StatusBadge({ level }) {
  const tone = level === 'resolved' ? 'success' : level === 'pending' ? 'warning' : 'info';
  const label = level === 'resolved' ? 'Resolu' : level === 'pending' ? 'En attente' : 'Ouvert';
  return <Badge tone={tone}>{label}</Badge>;
}

function enrichTicket(ticket) {
  const status = String(ticket.status || 'open').toLowerCase();
  const priority = String(ticket.priority || 'normal').toLowerCase();
  return {
    ...ticket,
    id: ticket.id || ticket.id_ticket,
    statusLevel: status.includes('closed') || status.includes('resolved') || status.includes('resolu') ? 'resolved' : status.includes('pending') || status.includes('wait') ? 'pending' : 'open',
    priorityLevel: priority.includes('high') || priority.includes('urgent') || priority.includes('haute') ? 'high' : priority.includes('low') || priority.includes('basse') ? 'low' : 'normal'
  };
}

function buildStats(tickets) {
  const today = new Date().toDateString();
  return {
    total: tickets.length,
    open: tickets.filter(item => item.statusLevel === 'open').length,
    pending: tickets.filter(item => item.statusLevel === 'pending').length,
    resolved: tickets.filter(item => item.statusLevel === 'resolved').length,
    highPriority: tickets.filter(item => item.priorityLevel === 'high').length,
    withEmail: tickets.filter(item => item.email).length,
    withoutMessage: tickets.filter(item => !item.message).length,
    today: tickets.filter(item => {
      const date = new Date(item.created_at || item.updated_at);
      return !Number.isNaN(date.getTime()) && date.toDateString() === today;
    }).length
  };
}

function filterTickets(tickets, filters) {
  const term = filters.query.trim().toLowerCase();
  return tickets.filter(ticket => {
    const haystack = `${ticket.subject || ''} ${ticket.message || ''} ${ticket.email || ''} ${ticket.user || ''}`.toLowerCase();
    const matchesTerm = !term || haystack.includes(term);
    const matchesStatus = filters.statusFilter === 'all' || ticket.statusLevel === filters.statusFilter;
    const matchesPriority = filters.priorityFilter === 'all' || ticket.priorityLevel === filters.priorityFilter;
    return matchesTerm && matchesStatus && matchesPriority;
  });
}

function formatDate(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}
