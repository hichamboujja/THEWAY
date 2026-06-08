import { getPlans, getRoles } from '../../api/adminApi.js';
import RolePermissionMatrix from '../../components/admin/RolePermissionMatrix.jsx';
import SubscriptionTable from '../../components/admin/SubscriptionTable.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useApi } from '../../hooks/useApi.js';
import styles from './AdminPage.module.css';

export default function AdminSettingsPage() {
  const { data, loading, error, reload } = useApi(async () => {
    const [roles, plans] = await Promise.all([getRoles(), getPlans()]);
    return { roles, plans };
  }, []);

  return (
    <>
      <PageHeader title="Parametres admin" subtitle="Roles, permissions et surfaces admin branchees sur les endpoints disponibles." />
      {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <LoadingState /> : (
        <div className={styles.stack}>
          <RolePermissionMatrix roles={data?.roles || []} loading={false} />
          <SubscriptionTable subscriptions={data?.plans || []} loading={false} />
        </div>
      )}
    </>
  );
}
