import { useState } from 'react';
import { analyseCV, getCurrentCV } from '../../api/cvApi.js';
import CVAnalysisPanel from '../../components/cv/CVAnalysisPanel.jsx';
import CVCurrentFileCard from '../../components/cv/CVCurrentFileCard.jsx';
import CVHealthWidget from '../../components/cv/CVHealthWidget.jsx';
import CVUploadBox from '../../components/cv/CVUploadBox.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useApi } from '../../hooks/useApi.js';
import styles from './CVPage.module.css';

export default function CVPage() {
  const { data, loading, error, reload } = useApi(getCurrentCV, []);
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState('');
  const [analysing, setAnalysing] = useState(false);
  const current = data?.cv || data?.file || data;
  const cvId = current?.id_cv || current?.id || data?.id_cv;

  async function runAnalyse() {
    if (!cvId) return;
    setAnalysing(true);
    setAnalysisError('');
    try {
      const result = await analyseCV(cvId);
      setAnalysis(result.analysis || result.cvAnalysis || result);
    } catch (error) {
      const providerDetails = error.raw?.error?.details || {};
      const messages = {
        ai_not_configured: 'Analyse IA indisponible: remplace AI_API_KEY par une vraie cle API et verifie AI_PROVIDER, AI_BASE_URL et AI_MODEL cote API.',
        ai_provider_error: 'Le fournisseur IA a refuse la requete. Verifie que AI_API_KEY est valide, active et autorisee pour le modele configure.',
        ai_invalid_json: 'Le fournisseur IA a repondu dans un format inattendu. Reessaie dans un instant.'
      };
      const providerMessages = {
        insufficient_quota: 'Quota OpenAI insuffisant: verifie la facturation, les credits ou les limites du projet associe a AI_API_KEY.',
        invalid_api_key: 'Cle API OpenAI invalide: remplace AI_API_KEY par une cle active du bon projet.'
      };
      const message = providerMessages[providerDetails.providerCode]
        || providerDetails.providerMessage
        || messages[error.code]
        || error.message
        || 'Impossible de lancer l analyse du CV.';
      setAnalysisError(message);
    } finally {
      setAnalysing(false);
    }
  }

  return (
    <>
      <PageHeader title="CV" subtitle="Import, consulte et analyse ton CV." />
      {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <LoadingState /> : (
        <div className={styles.grid}>
          <CVUploadBox onUploaded={reload} />
          <CVCurrentFileCard cv={data} />
          <CVHealthWidget cv={current} analysis={analysis} />
          <CVAnalysisPanel analysis={analysis} error={analysisError} loading={analysing} disabled={!cvId} onAnalyse={runAnalyse} />
        </div>
      )}
    </>
  );
}
