import DataTable from '../ui/DataTable.jsx';

export default function SubscriptionTable({ subscriptions = [], loading }) {
  return (
    <DataTable
      loading={loading}
      rows={subscriptions}
      columns={[
        { key: 'name', header: 'Plan' },
        { key: 'code', header: 'Code' },
        { key: 'monthly_price', header: 'Prix mensuel', render: (row) => `${row.monthly_price || 0} ${row.currency || 'MAD'}` },
        { key: 'features', header: 'Fonctions', render: (row) => Array.isArray(row.features) ? row.features.join(', ') : '' }
      ]}
      emptyMessage="Aucun plan actif."
    />
  );
}
