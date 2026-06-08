import DataTable from '../ui/DataTable.jsx';

export default function SupportTicketTable({ tickets = [], loading }) {
  return (
    <DataTable
      loading={loading}
      rows={tickets}
      columns={[
        { key: 'subject', header: 'Sujet' },
        { key: 'email', header: 'Utilisateur' },
        { key: 'priority', header: 'Priorite' },
        { key: 'status', header: 'Statut' },
        { key: 'updated_at', header: 'MAJ' }
      ]}
      emptyMessage="Aucun ticket support charge."
    />
  );
}
