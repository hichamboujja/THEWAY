import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, BriefcaseBusiness, CheckCircle2, FileText, Gauge, LogIn, MapPin, Search, Sparkles, UserPlus } from 'lucide-react';
import { listOpportunities } from '../api/opportunitiesApi.js';
import Button from '../components/ui/Button.jsx';
import backgroundImage from '../../../assets/images/main-background.png';
import iconImage from '../../../assets/images/icon.png';
import styles from './IndexPage.module.css';

export default function IndexPage() {
  const [filters, setFilters] = useState({ search: '', location: '' });
  const [opportunities, setOpportunities] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOpportunities();
  }, []);

  async function loadOpportunities(params = {}) {
    setLoading(true);
    try {
      const result = await listOpportunities({ ...params, limit: 6 });
      setOpportunities(result.opportunities || []);
      setTotal(result.pagination?.total || result.opportunities?.length || 0);
    } finally {
      setLoading(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    loadOpportunities({
      search: filters.search.trim(),
      location: filters.location.trim()
    });
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} to="/" aria-label="TheWay accueil">
          <img className={styles.brandLogo} src={iconImage} alt="" />
          <span>TheWay</span>
        </Link>
        <nav className={styles.nav}>
          <a href="#how">Fonctionnement</a>
          <a href="#offers">Offres</a>
          <a href="#features">Features</a>
        </nav>
        <div className={styles.authActions}>
          <Button as={Link} to="/login" variant="secondary" size="sm" icon={LogIn}>Login</Button>
          <Button as={Link} to="/register" size="sm" icon={UserPlus}>Register</Button>
        </div>
      </header>

      <main>
        <section className={styles.hero} style={{ '--hero-image': `url(${backgroundImage})` }}>
          <div className={styles.heroOverlay}>
            <div className={styles.heroContent}>
              <span className={styles.kicker}><Sparkles size={16} /> CV intelligence + job matching</span>
              <h1>TheWay</h1>
              <p>Une plateforme moderne pour importer ton CV, suivre tes competences, matcher les bonnes opportunites et postuler plus vite.</p>
              <div className={styles.heroActions}>
                <Button as={Link} to="/register" size="lg" icon={UserPlus}>Creer un compte</Button>
                <Button as={Link} to="/login" size="lg" variant="secondary" icon={LogIn}>Se connecter</Button>
              </div>
            </div>

            <div className={styles.productPreview} aria-label="Apercu TheWay">
              <div className={styles.previewHeader}>
                <span>Dashboard candidat</span>
                <strong>92%</strong>
              </div>
              <div className={styles.previewGrid}>
                <PreviewMetric icon={FileText} label="CV" value="Analyse" />
                <PreviewMetric icon={Gauge} label="Matching" value="IA" />
                <PreviewMetric icon={BriefcaseBusiness} label="Offres" value={formatNumber(total)} />
              </div>
              <div className={styles.previewList}>
                {(opportunities.length ? opportunities.slice(0, 3) : fallbackJobs).map((item, index) => (
                  <div key={`${item.title}-${index}`} className={styles.previewJob}>
                    <span>{index + 1}</span>
                    <div>
                      <strong>{item.title || 'Opportunite'}</strong>
                      <small>{item.company || item.location || 'Entreprise'}</small>
                    </div>
                    <em>{94 - index * 5}%</em>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.searchSection} id="offers">
          <form className={styles.searchForm} onSubmit={submit}>
            <label>
              <Search size={18} />
              <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Metier, entreprise, competence" />
            </label>
            <label>
              <MapPin size={18} />
              <input value={filters.location} onChange={(event) => setFilters({ ...filters, location: event.target.value })} placeholder="Ville ou localisation" />
            </label>
            <Button type="submit" icon={Search} loading={loading}>Rechercher</Button>
          </form>
          <div className={styles.offerStrip}>
            {opportunities.slice(0, 3).map(item => (
              <article key={item.id || item.uid || item.title}>
                <strong>{item.title || 'Offre sans titre'}</strong>
                <p>{item.company || 'Entreprise'} · {item.location || 'Lieu non specifie'}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.features} id="features">
          <div className={styles.sectionTitle}>
            <span>Pourquoi TheWay</span>
            <h2>Un parcours candidat complet, pas juste une liste d'offres.</h2>
          </div>
          <div className={styles.featureGrid}>
            <Feature icon={FileText} title="CV analyse">
              Extraction des competences, resume IA et signaux d'amelioration.
            </Feature>
            <Feature icon={BarChart3} title="Progression skills">
              Suivi des niveaux, priorites et objectifs pour ameliorer ton profil.
            </Feature>
            <Feature icon={Gauge} title="Matching explique">
              Scores, skills manquants et raisons du matching pour chaque offre.
            </Feature>
          </div>
        </section>

        <section className={styles.how} id="how">
          <div className={styles.sectionTitle}>
            <span>Workflow</span>
            <h2>De ton CV vers la bonne opportunite.</h2>
          </div>
          <div className={styles.steps}>
            <Step number="01" title="Cree ton compte" text="Inscris-toi et complete ton profil candidat." />
            <Step number="02" title="Upload ton CV" text="L'IA extrait les competences et prepare le matching." />
            <Step number="03" title="Sauvegarde et postule" text="Garde les meilleures offres et suis ton pipeline." />
          </div>
        </section>

        <section className={styles.cta}>
          <div>
            <h2>Pret a construire ton chemin ?</h2>
            <p>Commence avec ton CV, tes competences et les opportunites disponibles.</p>
          </div>
          <div>
            <Button as={Link} to="/register" icon={ArrowRight}>Creer un compte</Button>
            <Button as={Link} to="/login" variant="secondary">Login</Button>
          </div>
        </section>
      </main>
    </div>
  );
}

const fallbackJobs = [
  { title: 'Developpeur React', company: 'Tech team' },
  { title: 'Data Analyst', company: 'Analytics hub' },
  { title: 'Product Designer', company: 'Remote studio' }
];

function PreviewMetric({ icon: Icon, label, value }) {
  return (
    <div className={styles.previewMetric}>
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Feature({ icon: Icon, title, children }) {
  return (
    <article className={styles.feature}>
      <Icon size={22} />
      <h3>{title}</h3>
      <p>{children}</p>
      <span><CheckCircle2 size={15} /> Inclus</span>
    </article>
  );
}

function Step({ number, title, text }) {
  return (
    <article className={styles.step}>
      <span>{number}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function formatNumber(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value) || 0);
}
