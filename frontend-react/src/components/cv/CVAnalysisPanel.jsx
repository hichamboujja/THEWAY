import { Sparkles } from 'lucide-react';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import ExtractedSkillsList from './ExtractedSkillsList.jsx';
import styles from './CVAnalysisPanel.module.css';

export default function CVAnalysisPanel({ analysis, error, onAnalyse, loading, disabled }) {
  return (
    <Card className={styles.panel}>
      <div className={styles.header}>
        <div>
          <h3>Analyse IA</h3>
          <p>Extraction des competences et synthese du CV.</p>
        </div>
        <Button icon={Sparkles} loading={loading} disabled={disabled} onClick={onAnalyse}>Analyser</Button>
      </div>
      {error ? (
        <p className={styles.error}>{error}</p>
      ) : analysis ? (
        <div className={styles.result}>
          <p>{analysis.summary || analysis.resume || analysis.scann_analyse || 'Analyse terminee.'}</p>
          <ExtractedSkillsList skills={analysis.extractedSkills || analysis.extracted_skills || analysis.skills || analysis.competences || []} />
        </div>
      ) : (
        <p className={styles.muted}>Aucune analyse lancee pour le moment.</p>
      )}
    </Card>
  );
}
