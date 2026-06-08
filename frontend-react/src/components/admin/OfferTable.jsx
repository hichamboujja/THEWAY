import DataTable from '../ui/DataTable.jsx';

export default function OfferTable({ offers, loading }) {
  return (
    <DataTable
      loading={loading}
      rows={offers}
      columns={[
        { key: 'title', header: 'Offre' },
        { key: 'company', header: 'Entreprise' },
        { key: 'location', header: 'Lieu' },
        { key: 'source', header: 'Source' }
      ]}
    />
  );
}
