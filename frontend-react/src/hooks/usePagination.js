import { useMemo, useState } from 'react';

export function usePagination(initialPage = 1, initialLimit = 12) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  return useMemo(() => ({
    page,
    limit,
    setPage,
    setLimit,
    next: () => setPage((value) => value + 1),
    previous: () => setPage((value) => Math.max(1, value - 1))
  }), [limit, page]);
}
