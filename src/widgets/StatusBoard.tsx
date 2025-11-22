import { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { useLocalStorage } from '../hooks/useLocalStorage';

export type StatusItem = {
  id: string;
  label: string;
  value: string;
};

export type RemoteStatus = {
  title: string;
  description: string;
  apiUrl?: string;
  items: StatusItem[];
};

const defaultStatuses: RemoteStatus[] = [
  {
    title: 'GitLab Merge Requests',
    description: 'Track open MRs assigned to you',
    apiUrl: 'https://gitlab.com/api/v4/merge_requests?scope=assigned_to_me&state=opened',
    items: [
      { id: 'open', label: 'Open', value: '–' },
      { id: 'review', label: 'Needs review', value: '–' },
      { id: 'pipeline', label: 'Pipeline', value: '–' }
    ]
  },
  {
    title: 'Jira Sprint',
    description: 'Snapshot of active sprint issues',
    apiUrl: 'https://your-domain.atlassian.net/rest/api/3/search',
    items: [
      { id: 'todo', label: 'To do', value: '–' },
      { id: 'in-progress', label: 'In progress', value: '–' },
      { id: 'review', label: 'In review', value: '–' }
    ]
  }
];

async function fetchJson(url: string, token?: string) {
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

type StatusBoardProps = {
  authToken?: string;
};

export function StatusBoard({ authToken }: StatusBoardProps) {
  const [storedToken, setStoredToken] = useLocalStorage('homebase-token', '');
  const effectiveToken = authToken ?? storedToken;
  const [statuses, setStatuses] = useState(defaultStatuses);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const first = defaultStatuses[0];
    if (!first?.apiUrl || !effectiveToken) return;

    setLoading(true);
    fetchJson(first.apiUrl, effectiveToken)
      .then((payload) => {
        const count = Array.isArray(payload) ? payload.length : payload?.length ?? payload?.total ?? 0;
        setStatuses((prev) =>
          prev.map((entry) =>
            entry.apiUrl === first.apiUrl
              ? {
                  ...entry,
                  items: entry.items.map((item) =>
                    item.id === 'open' ? { ...item, value: String(count) } : item
                  )
                }
              : entry
          )
        );
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [effectiveToken]);

  return (
    <Card
      title="Status"
      subtitle="Client-side GitLab & Jira snapshots (paste a token to enable live counts)"
      actions={
        <input
          type="password"
          placeholder="Bearer token"
          value={storedToken}
          onChange={(event) => setStoredToken(event.target.value)}
          className="w-40 rounded-lg border border-white/10 bg-slate-900/60 px-3 py-1 text-sm text-white"
        />
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {statuses.map((status) => (
          <article
            key={status.title}
            className="rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-4"
          >
            <header className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">{status.title}</h3>
                <p className="text-sm text-slate-400">{status.description}</p>
              </div>
              {status.apiUrl && (
                <a
                  href={status.apiUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-accent"
                >
                  API ↗
                </a>
              )}
            </header>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              {status.items.map((item) => (
                <div key={item.id} className="rounded-xl bg-white/5 p-3">
                  <dt className="text-xs uppercase tracking-wide text-slate-400">{item.label}</dt>
                  <dd className="text-lg font-semibold text-white">{item.value}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
      {loading && <p className="mt-3 text-sm text-slate-300">Loading live status…</p>}
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
    </Card>
  );
}
