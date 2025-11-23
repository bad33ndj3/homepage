import { useCallback, useState } from 'react';
import type { RemoteStatus, StatusHighlight, StatusItem } from './StatusBoard';

export function useMergedStatus(loader: () => Promise<RemoteStatus | null>) {
  const [status, setStatus] = useState<RemoteStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loader();
      setStatus(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [loader]);

  return { status, loading, error, load };
}
