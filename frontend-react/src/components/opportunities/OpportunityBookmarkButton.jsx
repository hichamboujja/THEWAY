import { Bookmark } from 'lucide-react';
import { useEffect, useState } from 'react';
import { bookmarkOpportunity, removeBookmark } from '../../api/opportunitiesApi.js';
import Button from '../ui/Button.jsx';

export default function OpportunityBookmarkButton({ opportunity, onSaved }) {
  const [saved, setSaved] = useState(Boolean(opportunity.saved));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSaved(Boolean(opportunity.saved));
  }, [opportunity.saved, opportunity.id, opportunity.uid]);

  async function toggle() {
    const id = opportunity.id || opportunity.uid;
    if (!id) return;
    setLoading(true);
    try {
      if (saved) {
        await removeBookmark(id);
        setSaved(false);
        onSaved?.(id, false);
      } else {
        await bookmarkOpportunity(id);
        setSaved(true);
        onSaved?.(id, true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant={saved ? 'secondary' : 'ghost'} size="sm" icon={Bookmark} loading={loading} onClick={toggle}>
      {saved ? 'Sauvee' : 'Sauver'}
    </Button>
  );
}
