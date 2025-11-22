import { useEffect, useState } from 'react';
import { Card } from '../components/Card';

export type StatusItem = {
  id: string;
  label: string;
  value: string;
  href?: string;
};

type StatusHighlight = {
  title: string;
  url?: string;
  meta: string;
  badge?: string;
};

export type RemoteStatus = {
  id: string;
  title: string;
  description: string;
  apiUrl?: string;
  headers?: HeadersInit;
  envVar?: string;
  items: StatusItem[];
  highlights?: StatusHighlight[];
  transform?: (payload: unknown, status: RemoteStatus) => Partial<
    Pick<RemoteStatus, 'items' | 'highlights'>
  >;
};

type GitLabMergeRequest = {
  id: number;
  title: string;
  web_url: string;
  updated_at: string;
  source_branch: string;
  target_branch: string;
  merge_status?: string;
  draft?: boolean;
  work_in_progress?: boolean;
  head_pipeline?: {
    status?: string;
  };
};

const gitlabToken = sanitizeToken(import.meta.env.VITE_GITLAB_TOKEN);
const gitlabEndpoint =
  import.meta.env.VITE_GITLAB_API_URL ??
  'https://gitlab.com/api/v4/merge_requests?scope=assigned_to_me&state=opened';
const gitlabProjectNamespace = (import.meta.env.VITE_GITLAB_NAMESPACE ?? '').trim();

const defaultStatuses: RemoteStatus[] = [
  {
    id: 'gitlab',
    title: 'GitLab Merge Requests',
    description: 'Deep dive into assigned MRs: stale work, broken pipelines, recent push activity.',
    apiUrl: gitlabToken ? gitlabEndpoint : undefined,
    headers: gitlabToken ? { Authorization: `Bearer ${gitlabToken}` } : undefined,
    envVar: 'VITE_GITLAB_TOKEN',
    items: [
      { id: 'open', label: 'Open', value: '–' },
      { id: 'stale', label: 'Stale >48h', value: '–' },
      { id: 'pipeline', label: 'Pipeline failing', value: '–' },
      { id: 'conflicts', label: 'Conflicts', value: '–' }
    ],
    highlights: [],
    transform: (payload) => {
      const mrs = Array.isArray(payload) ? (payload as GitLabMergeRequest[]) : [];
      const { metrics, highlights } = buildGitLabInsights(mrs);
      return { items: metrics, highlights };
    }
  }
];

async function fetchJson(url: string, headers?: HeadersInit) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

export function StatusBoard() {
  const [statuses, setStatuses] = useState(defaultStatuses);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchStatuses = async () => {
      setLoading(true);
      setError(null);

      const updates = await Promise.all(
        defaultStatuses.map(async (status) => {
          if (!status.apiUrl || !status.headers) {
            return status;
          }

          try {
            const payload = await fetchJson(status.apiUrl, status.headers);
            if (cancelled) {
              return status;
            }

            return status.transform ? { ...status, ...status.transform(payload, status) } : status;
          } catch (err) {
            if (!cancelled) {
              setError((err as Error).message);
            }
            return status;
          }
        })
      );

      if (!cancelled) {
        setStatuses(updates);
        setLoading(false);
      }
    };

    fetchStatuses();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card
      title="GitLab Focus"
      subtitle="Assigned MRs at a glance: stale work, pipeline health, recent pushes."
      className="overflow-hidden"
    >
      {statuses.map((status) => (
        <section key={status.id} className="space-y-4">
          {!status.headers && status.envVar && (
            <p className="rounded-xl border border-dashed border-amber-200 px-3 py-2 text-xs text-amber-600 dark:border-amber-300/40 dark:text-amber-300">
              Add {status.envVar} to your .env file to enable live data.
            </p>
          )}

          <div className="grid gap-3 lg:grid-cols-4">
            {status.items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/40 bg-white/80 px-3 py-3 text-center shadow-sm dark:border-white/10 dark:bg-white/10"
              >
                <dt className="text-[11px] uppercase tracking-wide text-slate-400">{item.label}</dt>
                <dd className="text-2xl font-semibold text-slate-900 dark:text-white">{item.value}</dd>
              </div>
            ))}
          </div>

          {!!status.highlights?.length && (
            <div className="grid gap-3 lg:grid-cols-3">
              {status.highlights.map((highlight) => (
                <a
                  key={`${highlight.title}-${highlight.url ?? 'local'}`}
                  href={highlight.url}
                  target={highlight.url ? '_blank' : undefined}
                  rel={highlight.url ? 'noreferrer' : undefined}
                  className="flex flex-col gap-1 rounded-2xl border border-white/40 bg-white/80 px-3 py-3 text-left text-sm text-slate-900 shadow-sm transition hover:border-accent hover:text-accent dark:border-white/10 dark:bg-white/10 dark:text-white"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium line-clamp-2">{highlight.title}</p>
                    {highlight.badge && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-400/20 dark:text-amber-200">
                        {highlight.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-300">{highlight.meta}</p>
                </a>
              ))}
            </div>
          )}
        </section>
      ))}

      {loading && <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">Loading live status…</p>}
      {error && <p className="mt-3 text-sm text-rose-500 dark:text-rose-300">{error}</p>}
    </Card>
  );
}

function buildGitLabInsights(mrs: GitLabMergeRequest[]) {
  const now = Date.now();
  const staleThreshold = now - 1000 * 60 * 60 * 48;

  const stale = mrs.filter((mr) => new Date(mr.updated_at).getTime() < staleThreshold).length;
  const pipelineFailing = mrs.filter((mr) => mr.head_pipeline?.status === 'failed').length;
  const conflicts = mrs.filter((mr) => mr.merge_status === 'cannot_be_merged').length;

  const metrics: StatusItem[] = [
    {
      id: 'open',
      label: 'Open',
      value: String(mrs.length),
      href: buildGitLabFilterUrl({ state: 'opened' })
    },
    {
      id: 'stale',
      label: 'Stale >48h',
      value: String(stale),
      href: buildGitLabFilterUrl({ updated_before: new Date(staleThreshold).toISOString() })
    },
    {
      id: 'pipeline',
      label: 'Pipeline failing',
      value: String(pipelineFailing),
      href: buildGitLabFilterUrl({ with_pipeline_status: 'failed' })
    },
    {
      id: 'conflicts',
      label: 'Conflicts',
      value: String(conflicts),
      href: buildGitLabFilterUrl({ with_merge_status_recheck: 'true' })
    }
  ];

  const highlights: StatusHighlight[] = mrs
    .slice()
    .sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
    .slice(0, 3)
    .map((mr) => ({
      title: mr.title,
      url: mr.web_url,
      meta: `${mr.source_branch} → ${mr.target_branch} · updated ${formatRelativeTime(mr.updated_at)}`,
      badge: mr.head_pipeline?.status === 'failed'
        ? 'Pipeline failed'
        : mr.merge_status === 'cannot_be_merged'
        ? 'Conflicts'
        : mr.draft || mr.work_in_progress
        ? 'Draft'
        : undefined
    }));

  return { metrics, highlights };
}

type GitLabFilterParams = Record<string, string>;

function buildGitLabFilterUrl(params: GitLabFilterParams) {
  const base = gitlabProjectNamespace
    ? `https://gitlab.com/${gitlabProjectNamespace}/-/merge_requests`
    : 'https://gitlab.com/dashboard/merge_requests';
  const query = new URLSearchParams({ scope: 'assigned_to_me', state: 'opened', ...params });
  return `${base}?${query.toString()}`;
}

function normalizeCount(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload.length;
  }

  if (typeof payload === 'number') {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    if ('total' in payload && typeof (payload as { total?: number }).total === 'number') {
      return (payload as { total: number }).total;
    }

    if ('length' in payload && typeof (payload as { length?: number }).length === 'number') {
      return (payload as { length: number }).length;
    }
  }

  return 0;
}

function sanitizeToken(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const lower = trimmed.toLowerCase();
  if (lower.includes('your-token') || lower.includes('example')) {
    return undefined;
  }

  return trimmed;
}

function formatRelativeTime(dateString: string) {
  const timestamp = new Date(dateString).getTime();
  const diff = Date.now() - timestamp;
  if (Number.isNaN(timestamp) || diff < 0) {
    return 'just now';
  }

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
