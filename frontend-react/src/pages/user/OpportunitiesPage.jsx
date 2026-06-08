import { useState } from 'react';
import { listOpportunities } from '../../api/opportunitiesApi.js';
import SavedOpportunitiesWidget from '../../components/dashboard/SavedOpportunitiesWidget.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import Button from '../../components/ui/Button.jsx';
import OpportunityFilters from '../../components/opportunities/OpportunityFilters.jsx';
import OpportunityList from '../../components/opportunities/OpportunityList.jsx';
import SmartSearchBar from '../../components/opportunities/SmartSearchBar.jsx';
import { useApi } from '../../hooks/useApi.js';
import styles from './OpportunitiesPage.module.css';

export default function OpportunitiesPage() {
  const [filters, setFilters] = useState({ search: '', location: '', skill: '' });
  const [params, setParams] = useState({ page: 1, limit: 24 });
  const { data, loading, error, reload } = useApi(() => listOpportunities(params), [params]);
  const opportunities = data?.opportunities || [];
  const pagination = data?.pagination || { page: params.page, limit: params.limit, total: 0 };
  const totalPages = Math.max(1, Math.ceil((Number(pagination.total) || 0) / pagination.limit));
  const currentPage = Number(pagination.page) || params.page;

  function submit(event, nextFilters = filters) {
    event.preventDefault();
    setParams({ ...nextFilters, page: 1, limit: 24 });
  }

  function updateSearch(search) {
    setFilters(current => ({ ...current, search }));
  }

  function clearSearch() {
    const nextFilters = { ...filters, search: '' };
    setFilters(nextFilters);
    setParams({ ...nextFilters, page: 1, limit: 24 });
  }

  function goToPage(page) {
    setParams(current => ({ ...current, page }));
  }

  return (
    <>
      <PageHeader title="Opportunites" subtitle="Recherche, filtre et sauvegarde les offres issues du scraper." />
      <SmartSearchBar value={filters.search} onChange={updateSearch} onSubmit={submit} onClear={clearSearch} />
      <OpportunityFilters filters={filters} onChange={setFilters} onSubmit={submit} />
      {!error && !loading ? <SavedOpportunitiesWidget opportunities={opportunities} /> : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : <OpportunityList loading={loading} opportunities={opportunities} />}
      {!error && !loading && pagination.total ? (
        <div className={styles.pagination}>
          <p>{pagination.total} opportunites depuis la base de donnees</p>
          <div className={styles.controls}>
            <Button variant="secondary" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)}>
              Precedent
            </Button>
            <span>Page {currentPage} / {totalPages}</span>
            <Button variant="secondary" disabled={currentPage >= totalPages} onClick={() => goToPage(currentPage + 1)}>
              Suivant
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
