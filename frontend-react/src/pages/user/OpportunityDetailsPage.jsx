import { useParams } from 'react-router-dom';
import { getOpportunity } from '../../api/opportunitiesApi.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import OpportunityDetails from '../../components/opportunities/OpportunityDetails.jsx';
import { useApi } from '../../hooks/useApi.js';

export default function OpportunityDetailsPage() {
  const { id } = useParams();
  const { data, loading, error, reload } = useApi(() => getOpportunity(id), [id]);

  if (loading) return <LoadingState label="Chargement de l'offre" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title="Detail de l'offre" subtitle="Informations et actions candidat." />
      <OpportunityDetails opportunity={data} />
    </>
  );
}
