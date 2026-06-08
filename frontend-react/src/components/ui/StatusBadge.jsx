import Badge from './Badge.jsx';

const tones = {
  active: 'success',
  success: 'success',
  submitted: 'success',
  pending: 'warning',
  en_cours: 'warning',
  inactive: 'neutral',
  error: 'danger',
  failed: 'danger'
};

export default function StatusBadge({ status }) {
  const value = status || 'active';
  return <Badge tone={tones[value] || 'neutral'}>{String(value).replace('_', ' ')}</Badge>;
}
