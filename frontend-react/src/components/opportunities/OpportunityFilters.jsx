import { Search } from 'lucide-react';
import Button from '../ui/Button.jsx';
import styles from './OpportunityFilters.module.css';

export default function OpportunityFilters({ filters, onChange, onSubmit }) {
  return (
    <form className={styles.filters} onSubmit={onSubmit}>
      <label>
        Recherche
        <input value={filters.search || ''} onChange={(event) => onChange({ ...filters, search: event.target.value })} placeholder="Titre, entreprise, competence" />
      </label>
      <label>
        Localisation
        <input value={filters.location || ''} onChange={(event) => onChange({ ...filters, location: event.target.value })} placeholder="Casablanca, Rabat..." />
      </label>
      <label>
        Skill
        <input value={filters.skill || ''} onChange={(event) => onChange({ ...filters, skill: event.target.value })} placeholder="React, Python..." />
      </label>
      <Button type="submit" icon={Search}>Filtrer</Button>
    </form>
  );
}
