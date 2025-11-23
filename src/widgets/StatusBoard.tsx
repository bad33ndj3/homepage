import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

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
  tags?: string[];
  updatedAt?: string;
  sourceBranch?: string;
  targetBranch?: string;
  pipelineStatus?: string;
  isStale?: boolean;
  hasConflicts?: boolean;
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
    <Card className="overflow-hidden border border-white/40 bg-white/85 shadow-sm shadow-slate-200/70 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-black/30">
      <CardHeader className="space-y-1 pb-3">
        <CardTitle className="text-lg">GitLab Focus</CardTitle>
        <CardDescription className="text-xs">
          Above-the-fold focus on your open merge requests: stale work, conflicts, pipelines.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {statuses.map((status) => (
          <section key={status.id} className="space-y-3">
            {!status.headers && status.envVar && (
              <p className="rounded-xl border border-dashed border-amber-200 px-3 py-2 text-xs text-amber-600 dark:border-amber-300/40 dark:text-amber-300">
                Add {status.envVar} to your .env file to enable live data.
              </p>
            )}

            <div className="flex flex-wrap gap-2 text-sm">
              {status.items.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  target={item.href ? '_blank' : undefined}
                  rel={item.href ? 'noreferrer' : undefined}
                  className="inline-flex min-w-[140px] flex-1 items-center justify-between gap-3 rounded-2xl border border-white/50 bg-white/90 px-3 py-2 text-left shadow-sm transition hover:border-accent hover:text-accent dark:border-white/10 dark:bg-white/10"
                >
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-slate-400">{item.label}</dt>
                    <dd className="text-lg font-semibold text-slate-900 dark:text-white">{item.value}</dd>
                  </div>
                  <span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>

            {!!status.highlights?.length && (
              <div className="space-y-2">
                {status.highlights.map((highlight) => (
                  <a
                    key={`${highlight.title}-${highlight.url ?? 'local'}`}
                    href={highlight.url}
                    target={highlight.url ? '_blank' : undefined}
                    rel={highlight.url ? 'noreferrer' : undefined}
                    className="flex flex-col gap-1 rounded-2xl border border-white/40 bg-white/90 px-3 py-3 text-left text-sm text-slate-900 shadow-sm transition hover:border-accent hover:text-accent dark:border-white/10 dark:bg-white/10 dark:text-white"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-1 font-semibold">{highlight.title}</p>
                      <div className="flex flex-wrap items-center gap-1">
                        {highlight.tags?.map((tag) => (
                          <Badge
                            key={`${highlight.title}-${tag}`}
                            variant="secondary"
                            className={getTagClass(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                        {!highlight.tags?.length && highlight.badge && (
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-800 dark:bg-amber-400/20 dark:text-amber-200"
                          >
                            {highlight.badge}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-300">
                      {highlight.meta}
                    </p>
                    {highlight.updatedAt && (
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                        Updated {formatRelativeTime(highlight.updatedAt)}
                      </p>
                    )}
                  </a>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
              <span className={error ? 'text-rose-600 dark:text-rose-300' : undefined}>
                {loading ? 'Loading live status…' : error ?? 'Latest assigned items'}
              </span>
              <a
                href={buildGitLabFilterUrl({})}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-white/50 bg-white/80 px-3 py-1 font-semibold text-slate-700 transition hover:border-accent hover:text-accent dark:border-white/10 dark:bg-white/10 dark:text-white"
              >
                View all in GitLab ↗
              </a>
            </div>
          </section>
        ))}
      </CardContent>
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
    .slice(0, 5)
    .map((mr) => ({
      title: mr.title,
      url: mr.web_url,
      meta: `${mr.source_branch} → ${mr.target_branch}`,
      badge: mr.head_pipeline?.status === 'failed'
        ? 'Pipeline failed'
        : mr.merge_status === 'cannot_be_merged'
        ? 'Conflicts'
        : mr.draft || mr.work_in_progress
        ? 'Draft'
        : undefined,
      tags: buildHighlightTags({
        pipelineStatus: mr.head_pipeline?.status,
        mergeStatus: mr.merge_status,
        draft: mr.draft || mr.work_in_progress,
        updatedAt: mr.updated_at,
        staleThreshold
      }),
      updatedAt: mr.updated_at,
      sourceBranch: mr.source_branch,
      targetBranch: mr.target_branch,
      pipelineStatus: mr.head_pipeline?.status,
      isStale: new Date(mr.updated_at).getTime() < staleThreshold,
      hasConflicts: mr.merge_status === 'cannot_be_merged'
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

function buildHighlightTags({
  pipelineStatus,
  mergeStatus,
  draft,
  updatedAt,
  staleThreshold
}: {
  pipelineStatus?: string;
  mergeStatus?: string;
  draft?: boolean;
  updatedAt: string;
  staleThreshold: number;
}) {
  const tags: string[] = [];
  if (pipelineStatus === 'failed') tags.push('Pipeline');
  if (mergeStatus === 'cannot_be_merged') tags.push('Conflicts');
  if (draft) tags.push('Draft');

  const updated = new Date(updatedAt).getTime();
  if (!Number.isNaN(updated) && updated < staleThreshold) {
    tags.push('Stale');
  }
  return tags;
}

function getTagClass(tag: string) {
  const normalized = tag.toLowerCase();
  if (normalized.includes('conflict')) {
    return 'bg-rose-100 text-rose-800 dark:bg-rose-400/20 dark:text-rose-200';
  }
  if (normalized.includes('stale')) {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-400/20 dark:text-amber-100';
  }
  if (normalized.includes('pipeline')) {
    return 'bg-sky-100 text-sky-800 dark:bg-sky-400/20 dark:text-sky-100';
  }
  if (normalized.includes('draft')) {
    return 'bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-white';
  }
  return 'bg-white/80 text-slate-800 dark:bg-white/10 dark:text-white';
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
