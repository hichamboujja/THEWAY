import { getInvoices, getPlans } from '../../api/adminApi.js';
import InvoiceTable from '../../components/admin/InvoiceTable.jsx';
import SubscriptionTable from '../../components/admin/SubscriptionTable.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useApi } from '../../hooks/useApi.js';
import styles from './AdminPage.module.css';

export default function AdminBillingPage() {
  const { data, loading, error, reload } = useApi(async () => {
    const [invoices, plans] = await Promise.all([getInvoices(), getPlans()]);
    return { invoices, plans };
  }, []);

  return (
    <>
      <PageHeader title="Billing" subtitle="Factures et plans actifs." />
      {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <LoadingState /> : (
        <div className={styles.stack}>
          <InvoiceTable invoices={data?.invoices || []} />
          <SubscriptionTable subscriptions={data?.plans || []} />
        </div>
      )}
    </>
  );
}
