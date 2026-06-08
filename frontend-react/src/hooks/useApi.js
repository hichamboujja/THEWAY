import { useCallback, useEffect, useState } from 'react';

export function useApi(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const run = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await loader(...args);
      setData(result);
      return result;
    } catch (apiError) {
      setError(apiError.message || 'Erreur API');
      throw apiError;
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    run().catch(() => null);
  }, [run]);

  return { data, loading, error, reload: run, setData };
}
