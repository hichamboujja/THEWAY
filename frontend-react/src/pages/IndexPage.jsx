import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  Gauge,
  LogIn,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserPlus,
  Zap
} from 'lucide-react';
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
          <a href="#features">Features</a>
          <a href="#offers">Offres</a>
        </nav>
        <div className={styles.authActions}>
          <Button as={Link} to="/login" variant="secondary" size="sm" icon={LogIn}>Login</Button>
          <Button as={Link} to="/register" size="sm" icon={UserPlus}>Register</Button>
        </div>
      </header>

      <main>
        <section className={styles.hero} style={{ '--hero-image': `url(${backgroundImage})` }}>
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroInner}>
            <div className={styles.heroText}>
              <span className={styles.kicker}><Sparkles size={16} /> CV intelligence + job matching</span>
              <h1>Trouve ton prochain job, plus vite, avec l&apos;IA.</h1>
              <p>TheWay analyse ton CV, suit ta progression de competences et matche ton profil avec les meilleures opportunites - pour que tu postules au bon endroit, au bon moment.</p>
              <div className={styles.heroActions}>
                <Button as={Link} to="/register" size="lg" icon={UserPlus}>Creer un compte gratuit</Button>
                <Button as={Link} to="/login" size="lg" variant="secondary" icon={LogIn}>Se connecter</Button>
              </div>
              <div className={styles.heroTrust}>
                <ShieldCheck size={16} />
                <span>Sans engagement - configure ton profil en 5 minutes</span>
              </div>
            </div>

            <div className={styles.heroVisual}>
              <div className={styles.previewCard} aria-label="Apercu TheWay">
                <div className={styles.previewHeader}>
                  <div>
                    <span>Score de preparation</span>
                    <strong>Dashboard candidat</strong>
                  </div>
                  <div className={styles.previewScore}>
                    <span>92%</span>
                  </div>
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
              <div className={styles.floatingCard}>
                <span className={styles.floatingIcon}><TrendingUp size={18} /></span>
                <div>
                  <strong>+38%</strong>
                  <small>de reponses en plus</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.statsBar}>
          <Stat icon={BriefcaseBusiness} value={`${formatNumber(total || 1200)}+`} label="Offres actives" />
          <Stat icon={Target} value="92%" label="Precision du matching" />
          <Stat icon={Sparkles} value="50+" label="Competences suivies" />
          <Stat icon={Zap} value="3x" label="Plus rapide pour postuler" />
        </section>

        <section className={styles.features} id="features">
          <div className={styles.sectionTitle}>
            <span>Pourquoi TheWay</span>
            <h2>Un parcours candidat complet, pas juste une liste d&apos;offres.</h2>
            <p>Chaque outil dont tu as besoin pour construire un profil solide et trouver les opportunites qui te correspondent vraiment.</p>
          </div>
          <div className={styles.featureGrid}>
            <Feature icon={FileText} title="CV analyse par IA" large>
              Importe ton CV et laisse l&apos;IA extraire automatiquement tes competences, generer un resume et identifier les axes d&apos;amelioration prioritaires.
            </Feature>
            <Feature icon={BarChart3} title="Progression skills">
              Suivi des niveaux, priorites et objectifs pour faire progresser ton profil semaine apres semaine.
            </Feature>
            <Feature icon={Gauge} title="Matching explique">
              Scores de compatibilite, competences manquantes et raisons detaillees pour chaque offre proposee.
            </Feature>
            <Feature icon={BriefcaseBusiness} title="Pipeline de candidatures">
              Sauvegarde, organise et suis l&apos;avancement de toutes tes candidatures depuis un seul endroit.
            </Feature>
          </div>
        </section>

        <section className={styles.how} id="how">
          <div className={styles.sectionTitle}>
            <span>Workflow</span>
            <h2>De ton CV vers la bonne opportunite, en 3 etapes.</h2>
          </div>
          <div className={styles.timeline}>
            <Step number="01" title="Cree ton compte" text="Inscris-toi en quelques secondes et complete ton profil candidat." />
            <Step number="02" title="Upload ton CV" text="L'IA extrait tes competences, calcule ton score et prepare le matching." />
            <Step number="03" title="Sauvegarde et postule" text="Identifie les meilleures offres, garde-les et suis ton pipeline en temps reel." />
          </div>
        </section>

        <section className={styles.offers} id="offers">
          <div className={styles.sectionTitle}>
            <span>Offres en direct</span>
            <h2>Cherche une opportunite qui te correspond.</h2>
          </div>
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
            {(opportunities.length ? opportunities.slice(0, 3) : fallbackJobs).map((item, index) => (
              <article key={item.id || item.uid || `${item.title}-${index}`}>
                <span className={styles.offerBadge}><BriefcaseBusiness size={16} /></span>
                <strong>{item.title || 'Offre sans titre'}</strong>
                <p>{item.company || 'Entreprise'} - {item.location || 'Lieu non specifie'}</p>
                <Link to="/register" className={styles.offerLink}>Voir l&apos;offre <ArrowRight size={14} /></Link>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.cta}>
          <div className={styles.ctaGlow} aria-hidden="true" />
          <div className={styles.ctaContent}>
            <span className={styles.kicker}><CheckCircle2 size={16} /> Pret en quelques minutes</span>
            <h2>Pret a construire ton chemin ?</h2>
            <p>Commence avec ton CV, tes competences et les opportunites disponibles - gratuitement.</p>
          </div>
          <div className={styles.ctaActions}>
            <Button as={Link} to="/register" size="lg" icon={ArrowRight}>Creer un compte</Button>
            <Button as={Link} to="/login" size="lg" variant="secondary">Login</Button>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <Link className={styles.brand} to="/" aria-label="TheWay accueil">
            <img className={styles.brandLogo} src={iconImage} alt="" />
            <span>TheWay</span>
          </Link>
          <nav className={styles.footerNav}>
            <a href="#features">Features</a>
            <a href="#how">Fonctionnement</a>
            <a href="#offers">Offres</a>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </nav>
        </div>
        <div className={styles.footerBottom}>
          <p>&copy; {new Date().getFullYear()} TheWay. Tous droits reserves.</p>
          <p>CV intelligence + job matching</p>
        </div>
      </footer>
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

function Stat({ icon: Icon, value, label }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statIcon}><Icon size={20} /></span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title, children, large }) {
  return (
    <article className={[styles.feature, large ? styles.featureLarge : ''].filter(Boolean).join(' ')}>
      <span className={styles.featureIcon}><Icon size={22} /></span>
      <h3>{title}</h3>
      <p>{children}</p>
      <span className={styles.featureTag}><CheckCircle2 size={15} /> Inclus</span>
    </article>
  );
}

function Step({ number, title, text }) {
  return (
    <article className={styles.step}>
      <span className={styles.stepNumber}>{number}</span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </article>
  );
}

function formatNumber(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value) || 0);
}
