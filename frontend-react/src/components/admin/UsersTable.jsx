import DataTable from '../ui/DataTable.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';

export default function UsersTable({ users, loading }) {
  return (
    <DataTable
      loading={loading}
      rows={users}
      columns={[
        { key: 'name', header: 'Nom', render: (row) => row.name || [row.prenom, row.nom].filter(Boolean).join(' ') },
        { key: 'email', header: 'Email' },
        { key: 'telephone', header: 'Telephone' },
        { key: 'role', header: 'Role', render: (row) => <StatusBadge status={row.role || 'user'} /> },
        { key: 'date_inscription', header: 'Inscription' }
      ]}
    />
  );
}
