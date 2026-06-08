import { useState } from 'react';
import { listMatching, runMatching } from '../../api/matchingApi.js';
import { listOpportunities } from '../../api/opportunitiesApi.js';
import { listSkills } from '../../api/skillsApi.js';
import SkillGapWidget from '../../components/dashboard/SkillGapWidget.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import MatchingExplainabilityWidget from '../../components/matching/MatchingExplainabilityWidget.jsx';
import MatchingRunPanel from '../../components/matching/MatchingRunPanel.jsx';
import OpportunityCard from '../../components/opportunities/OpportunityCard.jsx';
import { useApi } from '../../hooks/useApi.js';
import styles from './MatchingPage.module.css';

export default function MatchingPage() {
  const [params, setParams] = useState({ page: 1, limit: 10 });
  const { data, loading, error, reload, setData } = useApi(() => loadMatchingPageData(params), [params]);
  const [running, setRunning] = useState(false);
  const matching = data?.matching || {};
  const results = matching?.matches || matching?.matching || matching?.results || [];
  const opportunityStatus = data?.opportunityStatus || new Map();
  const opportunities = results.map(result => toOpportunityMatch(result, opportunityStatus));
  const skills = data?.skills || [];
  const pagination = matching?.pagination || { page: params.page, limit: params.limit, total: 0 };
  const totalPages = Math.max(1, Math.ceil((Number(pagination.total) || 0) / pagination.limit));
  const currentPage = Number(pagination.page) || params.page;

  async function run() {
    setRunning(true);
    try {
      await runMatching({});
      setParams(current => ({ ...current, page: 1 }));
      const refreshed = await loadMatchingPageData({ ...params, page: 1 });
      setData(refreshed);
    } finally {
      setRunning(false);
    }
  }

  function goToPage(page) {
    setParams(current => ({ ...current, page }));
  }

  function handleSaved(opportunityId, saved) {
    setData(current => {
      if (!current?.matching) return current;
      const currentResults = current.matching.matches || current.matching.matching || current.matching.results || [];
      const updatedResults = currentResults.map(result => {
        const id = result.opportunity_id || result.opportunity?.id || result.id;
        return String(id) === String(opportunityId) ? { ...result, saved } : result;
      });
      const nextStatus = new Map(current.opportunityStatus || []);
      const status = nextStatus.get(String(opportunityId)) || {};
      nextStatus.set(String(opportunityId), { ...status, saved });
      return {
        ...current,
        opportunityStatus: nextStatus,
        matching: { ...current.matching, matches: updatedResults }
      };
    });
  }

  return (
    <>
      <PageHeader title="Matching" subtitle="Lance et consulte tes recommandations IA." />
      <MatchingRunPanel loading={running} onRun={run} />
      {!error && !loading && opportunities.length ? <SkillGapWidget skills={skills} opportunities={opportunities} /> : null}
      <div className={styles.results}>
        {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <LoadingState /> : results.length ? results.map((result, index) => (
          <article key={result.id || result.opportunity_id || index} className={styles.matchCard}>
            <OpportunityCard opportunity={toOpportunityMatch(result, opportunityStatus)} onSaved={handleSaved} />
            <MatchingExplainabilityWidget result={result} />
          </article>
        )) : <EmptyState title="Aucun matching" message="Lance un matching pour obtenir des resultats." />}
      </div>
      {!error && !loading && pagination.total ? (
        <div className={styles.pagination}>
          <p>{pagination.total} recommandations dans le dernier matching</p>
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

async function loadMatchingPageData(params) {
  const [matching, skills, opportunities] = await Promise.all([
    listMatching(params),
    listSkills().catch(() => []),
    listOpportunities({ limit: 100 }).catch(() => ({ opportunities: [] }))
  ]);
  return { matching, skills, opportunityStatus: buildOpportunityStatusMap(opportunities?.opportunities || []) };
}

function toOpportunityMatch(result, statusMap = new Map()) {
  const opportunity = result.opportunity || result;
  const id = result.opportunity_id || opportunity.id || opportunity.uid;
  const status = statusMap.get(String(id)) || statusMap.get(String(opportunity.uid)) || {};
  return {
    ...opportunity,
    id,
    score: result.score || result.match_score || result.matchScore || opportunity.score,
    matched_skills: result.matched_skills || result.matchedSkills || opportunity.skills,
    missing_skills: result.missing_skills || result.missingSkills || result.gaps,
    saved: Boolean(result.saved ?? opportunity.saved ?? status.saved),
    applied: Boolean(result.applied ?? opportunity.applied ?? status.applied)
  };
}

function buildOpportunityStatusMap(opportunities) {
  const map = new Map();
  opportunities.forEach(opportunity => {
    const status = { saved: Boolean(opportunity.saved), applied: Boolean(opportunity.applied) };
    if (opportunity.id !== undefined && opportunity.id !== null) map.set(String(opportunity.id), status);
    if (opportunity.uid) map.set(String(opportunity.uid), status);
  });
  return map;
}
