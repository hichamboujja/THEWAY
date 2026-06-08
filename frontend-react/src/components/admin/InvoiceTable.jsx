import DataTable from '../ui/DataTable.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';

export default function InvoiceTable({ invoices = [], loading }) {
  return (
    <DataTable
      loading={loading}
      rows={invoices}
      columns={[
        { key: 'invoice_number', header: 'Facture' },
        { key: 'plan_name', header: 'Plan' },
        { key: 'amount', header: 'Montant', render: (row) => `${row.amount || 0} ${row.currency || 'MAD'}` },
        { key: 'status', header: 'Statut', render: (row) => <StatusBadge status={row.status} /> },
        { key: 'issued_at', header: 'Emission' },
        { key: 'due_at', header: 'Echeance' }
      ]}
      emptyMessage="Aucune facture disponible."
    />
  );
}
