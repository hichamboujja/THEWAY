import { Link } from 'react-router-dom';
import { BriefcaseBusiness, FileText, Gauge, Sparkles, Target } from 'lucide-react';
import { getCurrentCV } from '../../api/cvApi.js';
import { listMatching } from '../../api/matchingApi.js';
import { listNotifications } from '../../api/notificationsApi.js';
import { listOpportunities } from '../../api/opportunitiesApi.js';
import { getProfile } from '../../api/profileApi.js';
import { listSkills } from '../../api/skillsApi.js';
import AIJobCoachWidget from '../../components/dashboard/AIJobCoachWidget.jsx';
import ApplicationPipelineWidget from '../../components/dashboard/ApplicationPipelineWidget.jsx';
import CareerScoreWidget from '../../components/dashboard/CareerScoreWidget.jsx';
import MarketInsightsWidget from '../../components/dashboard/MarketInsightsWidget.jsx';
import NextBestActionWidget from '../../components/dashboard/NextBestActionWidget.jsx';
import NotificationCenterWidget from '../../components/dashboard/NotificationCenterWidget.jsx';
import ProfileCompletenessWidget from '../../components/dashboard/ProfileCompletenessWidget.jsx';
import RecommendedOpportunitiesWidget from '../../components/dashboard/RecommendedOpportunitiesWidget.jsx';
import SavedOpportunitiesWidget from '../../components/dashboard/SavedOpportunitiesWidget.jsx';
import SkillGapWidget from '../../components/dashboard/SkillGapWidget.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import { useApi } from '../../hooks/useApi.js';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { data, loading, error, reload } = useApi(loadDashboardData, []);
  const opportunities = data?.opportunities?.opportunities || [];
  const opportunitiesTotal = data?.opportunities?.pagination?.total || opportunities.length;
  const skills = data?.skills || [];
  const cv = normaliseCV(data?.cv);
  const matches = data?.matching?.matches || data?.matching?.matching || data?.matching?.results || [];
  const notifications = data?.notifications?.notifications || data?.notifications || [];
  const savedCount = opportunities.filter(item => item.saved).length;
  const averageSkillScore = skills.length ? Math.round(skills.reduce((sum, skill) => sum + (Number(skill.score) || 0), 0) / skills.length) : 0;
  const bestMatch = matches[0] || null;
  const nextSteps = buildNextSteps({ skills, cv, matches, opportunities });

  return (
    <>
      <PageHeader title="Dashboard candidat" subtitle="Pilote ton CV, tes competences, ton matching et les offres a traiter." />
      <div className={styles.actionsGrid}>
        <QuickCard icon={BriefcaseBusiness} title="Opportunites" to="/opportunities" />
        <QuickCard icon={FileText} title="CV" to="/cv" />
        <QuickCard icon={Sparkles} title="Competences" to="/skills" />
        <QuickCard icon={Gauge} title="Matching" to="/matching" />
      </div>
      {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <LoadingState /> : (
        <>
          <div className={styles.overviewGrid}>
            <ProfileCompletenessWidget profile={data?.profile || {}} cv={cv} skills={skills} matches={matches} savedCount={savedCount} />
            <MetricCard icon={BriefcaseBusiness} label="Offres disponibles" value={opportunitiesTotal} helper={`${savedCount} sauvegardee${savedCount > 1 ? 's' : ''}`} />
            <MetricCard icon={Sparkles} label="Score competences" value={`${averageSkillScore}%`} helper={`${skills.length} competence${skills.length > 1 ? 's' : ''} suivie${skills.length > 1 ? 's' : ''}`} />
            <MetricCard icon={Target} label="Meilleur matching" value={bestMatch ? `${scoreOf(bestMatch)}%` : '--'} helper={bestMatch ? bestMatch.title || bestMatch.opportunity?.title || 'Recommandation disponible' : 'Lance un matching'} />
          </div>

          <div className={styles.widgetsGrid}>
            <NextBestActionWidget steps={nextSteps} />
            <CareerScoreWidget cv={cv} skills={skills} matches={matches} opportunities={opportunities} />
            <RecommendedOpportunitiesWidget matches={matches} opportunities={opportunities} />
            <SavedOpportunitiesWidget opportunities={opportunities} />
            <NotificationCenterWidget notifications={notifications} />
            <SkillGapWidget skills={skills} opportunities={opportunities} />
            <ApplicationPipelineWidget opportunities={opportunities} />
            <MarketInsightsWidget opportunities={opportunities} />
            <AIJobCoachWidget cv={cv} skills={skills} matches={matches} />
          </div>
        </>
      )}
    </>
  );
}

async function loadDashboardData() {
  const [opportunities, skills, cv, matching, profile, notifications] = await Promise.all([
    listOpportunities({ limit: 100 }),
    listSkills(),
    getCurrentCV().catch(() => null),
    listMatching({ page: 1, limit: 3 }).catch(() => ({ matches: [], pagination: { total: 0 } })),
    getProfile().catch(() => ({})),
    listNotifications().catch(() => ({ notifications: [] }))
  ]);

  return { opportunities, skills, cv, matching, profile, notifications };
}

function QuickCard({ icon: Icon, title, to }) {
  return (
    <Card className={styles.quick}>
      <span className={styles.quickIcon}><Icon size={22} /></span>
      <h3>{title}</h3>
      <Button as={Link} to={to} variant="secondary">Ouvrir</Button>
    </Card>
  );
}

function MetricCard({ icon: Icon, label, value, helper }) {
  return (
    <Card className={styles.metric}>
      <div className={styles.metricIcon}><Icon size={20} /></div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{helper}</p>
      </div>
    </Card>
  );
}

function buildNextSteps({ skills, cv, matches, opportunities }) {
  const steps = [];
  if (!cv) steps.push({ icon: '1', title: 'Importer ton CV', description: 'Base necessaire pour analyser ton profil.', to: '/cv' });
  if (skills.length < 5) steps.push({ icon: '2', title: 'Completer tes competences', description: 'Ajoute au moins 5 competences prioritaires.', to: '/skills' });
  if (!matches.length) steps.push({ icon: '3', title: 'Lancer le matching', description: 'Classe les offres selon ton profil actuel.', to: '/matching' });
  if (opportunities.some(item => !item.saved)) steps.push({ icon: '4', title: 'Qualifier les offres', description: 'Sauvegarde les pistes interessantes.', to: '/opportunities' });
  return steps.slice(0, 4);
}

function normaliseCV(payload) {
  if (!payload) return null;
  if ('cv' in payload) return payload.cv || null;
  if ('file' in payload) return payload.file || null;
  if (payload.id_cv || payload.id || payload.filename || payload.fichier) return payload;
  return null;
}

function scoreOf(match) {
  return Math.round(Number(match?.score || match?.match_score || match?.matchScore) || 0);
}
