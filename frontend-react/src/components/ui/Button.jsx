import styles from './Button.module.css';

export default function Button({ children, variant = 'primary', size = 'md', icon: Icon, loading, className = '', as: Component = 'button', ...props }) {
  return (
    <Component className={[styles.button, styles[variant], styles[size], className].filter(Boolean).join(' ')} disabled={loading || props.disabled} {...props}>
      {Icon ? <Icon size={16} aria-hidden="true" /> : null}
      <span>{loading ? 'Chargement...' : children}</span>
    </Component>
  );
}
