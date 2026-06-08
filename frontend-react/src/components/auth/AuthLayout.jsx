import { BriefcaseBusiness, CheckCircle2, FileText, Sparkles, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import iconImage from '../../../../assets/images/icon.png';
import styles from './AuthLayout.module.css';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <main className={styles.page}>
      <section className={styles.brandPanel}>
        <Link className={styles.brand} to="/" aria-label="TheWay accueil">
          <img src={iconImage} alt="" />
          <span>
            <strong>THE<span>WAY</span></strong>
            <small>Data - Insights - Opportunities</small>
          </span>
        </Link>

        <div className={styles.brandCopy}>
          <div className={styles.brandMark}><BriefcaseBusiness size={26} /></div>
          <h1>Votre prochain emploi commence ici.</h1>
          <p>Analyse de CV, extraction de competences et matching avec les opportunites les plus pertinentes.</p>
        </div>

        <div className={styles.previewCard} aria-label="Apercu du parcours TheWay">
          <div className={styles.previewHeader}>
            <span><Sparkles size={16} /> Parcours candidat</span>
            <strong>92%</strong>
          </div>
          <div className={styles.steps}>
            <Step icon={FileText} title="CV analyse" text="Competences detectees automatiquement" />
            <Step icon={Target} title="Matching pret" text="Offres scorees selon ton profil" />
            <Step icon={CheckCircle2} title="Action rapide" text="Sauvegarde et candidature depuis ton espace" />
          </div>
        </div>
      </section>
      <section className={styles.formPanel}>
        <div className={styles.formShell}>
          <div className={styles.heading}>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}

function Step({ icon: Icon, title, text }) {
  return (
    <div className={styles.step}>
      <div><Icon size={18} aria-hidden="true" /></div>
      <span>
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
    </div>
  );
}
