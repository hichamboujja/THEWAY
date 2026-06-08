import styles from './SkillLevelBar.module.css';

export default function SkillLevelBar({ score = 0, showValue = false, size = 'md' }) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  const tone = value < 60 ? 'weak' : value < 80 ? 'steady' : 'strong';

  return (
    <div className={styles.wrap}>
      <div
        className={[styles.track, styles[tone], styles[size]].filter(Boolean).join(' ')}
        aria-label={`Niveau ${value}%`}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={value}
        role="progressbar"
      >
        <span style={{ width: `${value}%` }} />
      </div>
      {showValue ? <strong className={styles.value}>{value}%</strong> : null}
    </div>
  );
}
