import Badge from '../ui/Badge.jsx';

export default function SkillTag({ skill }) {
  const label = typeof skill === 'string' ? skill : skill?.nom || skill?.name;
  return <Badge tone="info">{label}</Badge>;
}
