import { Search, SlidersHorizontal, X } from 'lucide-react';
import Button from '../ui/Button.jsx';
import styles from './SmartSearchBar.module.css';

export default function SmartSearchBar({ value = '', onChange, onSubmit, onClear }) {
  return (
    <form className={styles.search} onSubmit={onSubmit}>
      <div className={styles.inputWrap}>
        <Search size={18} />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search title, company, skill, source..."
        />
        {value ? (
          <button type="button" aria-label="Effacer la recherche" onClick={onClear}>
            <X size={16} />
          </button>
        ) : null}
      </div>
      <Button type="submit" icon={SlidersHorizontal}>Search</Button>
    </form>
  );
}
