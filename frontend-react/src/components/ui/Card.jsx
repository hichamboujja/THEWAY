import styles from './Card.module.css';

export default function Card({ children, className = '', as: Component = 'section' }) {
  return <Component className={[styles.card, className].filter(Boolean).join(' ')}>{children}</Component>;
}
