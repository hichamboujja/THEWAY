import { X } from 'lucide-react';
import Button from './Button.jsx';
import styles from './Modal.module.css';

export default function Modal({ title, open, onClose, children }) {
  if (!open) return null;
  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <Button variant="ghost" size="sm" icon={X} onClick={onClose}><span className="sr-only">Fermer</span></Button>
        </header>
        {children}
      </section>
    </div>
  );
}
