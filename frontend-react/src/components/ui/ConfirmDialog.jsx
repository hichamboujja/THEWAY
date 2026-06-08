import Button from './Button.jsx';
import Modal from './Modal.jsx';
import styles from './Modal.module.css';

export default function ConfirmDialog({ open, title = 'Confirmer', message, onCancel, onConfirm, confirmLabel = 'Confirmer' }) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <p>{message}</p>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
