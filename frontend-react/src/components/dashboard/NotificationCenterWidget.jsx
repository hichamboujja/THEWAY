import { useEffect, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { markNotificationRead } from '../../api/notificationsApi.js';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import styles from './SimpleDashboardWidget.module.css';

export default function NotificationCenterWidget({ notifications = [] }) {
  const [items, setItems] = useState(notifications);
  const [updatingId, setUpdatingId] = useState(null);
  const unreadCount = items.filter(item => !item.lu).length;

  useEffect(() => {
    setItems(notifications);
  }, [notifications]);

  async function handleMarkRead(item) {
    const id = item.id_notification || item.id;
    if (!id || item.lu) return;
    setUpdatingId(id);
    try {
      await markNotificationRead(id, true);
      setItems(current => current.map(notification => (
        (notification.id_notification || notification.id) === id ? { ...notification, lu: true } : notification
      )));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <Card className={styles.widget}>
      <div className={styles.header}>
        <span><Bell size={18} /> Notifications</span>
        <strong>{unreadCount}</strong>
      </div>
      <div className={styles.list}>
        {items.length ? items.map(item => {
          const id = item.id_notification || item.id || `${item.type}-${item.date_notification}`;
          return (
            <div key={id} className={styles.note}>
              <div className={styles.noteHeader}>
                <strong>{item.type || 'Notification'}</strong>
                {!item.lu ? <span>Non lue</span> : null}
              </div>
              <p>{item.message || 'Notification disponible.'}</p>
              <div className={styles.noteMeta}>
                <time dateTime={item.date_notification || undefined}>{formatDate(item.date_notification)}</time>
                {!item.lu ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    icon={Check}
                    loading={updatingId === id}
                    onClick={() => handleMarkRead(item)}
                  >
                    Marquer lue
                  </Button>
                ) : null}
              </div>
            </div>
          );
        }) : <p className={styles.empty}>Aucune notification pour le moment.</p>}
      </div>
    </Card>
  );
}

function formatDate(value) {
  if (!value) return 'Date inconnue';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}
