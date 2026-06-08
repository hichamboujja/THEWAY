import { getPanelUsers } from '../../api/adminApi.js';
import UsersTable from '../../components/admin/UsersTable.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import { useApi } from '../../hooks/useApi.js';

export default function AdminUsersPage() {
  const { data, loading, error, reload } = useApi(getPanelUsers, []);
  return (
    <>
      <PageHeader title="Utilisateurs" subtitle="Liste des comptes exposee par /api/panel/users." />
      {error ? <ErrorState message={error} onRetry={reload} /> : <UsersTable users={data || []} loading={loading} />}
    </>
  );
}
