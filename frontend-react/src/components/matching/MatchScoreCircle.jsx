import styles from './MatchScoreCircle.module.css';

export default function MatchScoreCircle({ score = 0 }) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  return (
    <div className={styles.circle} style={{ '--score': `${value * 3.6}deg` }}>
      <span>{value}</span>
    </div>
  );
}
