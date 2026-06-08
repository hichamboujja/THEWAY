import { listSkills } from '../../api/skillsApi.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import CompetencyProgressionWidget from '../../components/skills/CompetencyProgressionWidget.jsx';
import SkillEditor from '../../components/skills/SkillEditor.jsx';
import { useApi } from '../../hooks/useApi.js';

export default function SkillsPage() {
  const { data, loading, error, reload } = useApi(listSkills, []);

  return (
    <>
      <PageHeader title="Competences" subtitle="Ajoute et maintiens les competences utilisees pour le matching." />
      {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <LoadingState /> : (
        <>
          <CompetencyProgressionWidget skills={data || []} />
          <SkillEditor skills={data || []} onChanged={reload} />
        </>
      )}
    </>
  );
}
