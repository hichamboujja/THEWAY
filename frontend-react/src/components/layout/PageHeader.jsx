import styles from './PageHeader.module.css';

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <header className={styles.header}>
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}
