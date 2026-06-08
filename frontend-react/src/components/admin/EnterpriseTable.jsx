import DataTable from '../ui/DataTable.jsx';

export default function EnterpriseTable({ enterprises, loading }) {
  return (
    <DataTable
      loading={loading}
      rows={enterprises}
      columns={[
        { key: 'company', header: 'Entreprise' },
        { key: 'total', header: 'Offres' }
      ]}
      emptyMessage="Aucune entreprise disponible via les endpoints actuels."
    />
  );
}
