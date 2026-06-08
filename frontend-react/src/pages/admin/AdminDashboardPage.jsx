import { getPanelSummary } from '../../api/adminApi.js';
import AdminDashboardWidgets from '../../components/admin/AdminDashboardWidgets.jsx';
import AdminStatsGrid from '../../components/admin/AdminStatsGrid.jsx';
import OfferTable from '../../components/admin/OfferTable.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useApi } from '../../hooks/useApi.js';
import styles from './AdminPage.module.css';

export default function AdminDashboardPage() {
  const { data, loading, error, reload } = useApi(getPanelSummary, []);

  return (
    <>
      <PageHeader title="Dashboard admin" subtitle="Statistiques backend et dernieres opportunites." />
      {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <LoadingState /> : (
        <div className={styles.stack}>
          <AdminStatsGrid summary={data?.summary} />
          <AdminDashboardWidgets summary={data?.summary} offers={data?.recentOpportunities || []} />
          <OfferTable offers={data?.recentOpportunities || []} />
        </div>
      )}
    </>
  );
}
