import { Send } from 'lucide-react';
import { useState } from 'react';
import { applyToOpportunity } from '../../api/opportunitiesApi.js';
import Button from '../ui/Button.jsx';

export default function OpportunityApplyButton({ opportunity }) {
  const [applied, setApplied] = useState(Boolean(opportunity.applied));
  const [loading, setLoading] = useState(false);

  async function apply() {
    setLoading(true);
    try {
      await applyToOpportunity(opportunity.id || opportunity.uid, {});
      setApplied(true);
    } finally {
      setLoading(false);
    }
  }

  return <Button icon={Send} loading={loading} disabled={applied} onClick={apply}>{applied ? 'Postule' : 'Postuler'}</Button>;
}
