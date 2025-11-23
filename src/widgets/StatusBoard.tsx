import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMergedStatus } from './useMergedStatus';

export type StatusItem = {
  id: string;
  label: string;
  value: string;
  href?: string;
};

export type StatusHighlight = {
  title: string;
  url?: string;
  meta: string;
  badge?: string;
  tags?: string[];
  updatedAt?: string;
  sourceBranch?: string;
  targetBranch?: string;
  pipelineStatus?: string;
  reviewers?: string[];
  labels?: string[];
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
  merged_at?: string;
  source_branch: string;
  target_branch: string;
  merge_status?: string;
  draft?: boolean;
  work_in_progress?: boolean;
  labels?: Array<{ title: string }>;
  reviewers?: Array<{ name: string }>;
  head_pipeline?: {
    status?: string;
    web_url?: string;
  };
};

const gitlabToken = sanitizeToken(import.meta.env.VITE_GITLAB_TOKEN);
const gitlabUsername = (import.meta.env.VITE_GITLAB_USERNAME ?? '').trim();
const gitlabEndpoint =
  import.meta.env.VITE_GITLAB_API_URL ??
  buildDefaultGitLabApiUrl();
const MERGED_LOOKBACK_DAYS = 14;
const mergedSince = new Date(Date.now() - MERGED_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
const gitlabMergedEndpoint = gitlabToken
  ? buildDefaultGitLabApiUrl({
      state: 'merged',
      updated_after: mergedSince.toISOString(),
      order_by: 'updated_at'
    })
  : undefined;
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
] as RemoteStatus[];

async function fetchJson(url: string, headers?: HeadersInit) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

type StatusBoardProps = {
  onHighlightsChange?: (highlights: StatusHighlight[]) => void;
};

export function StatusBoard({ onHighlightsChange }: StatusBoardProps) {
  const [statuses, setStatuses] = useState(defaultStatuses);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    status: mergedStatus,
    loading: mergedLoading,
    error: mergedError,
    load: loadMerged
  } = useMergedStatus(async () => {
    if (!gitlabMergedEndpoint || !gitlabToken) return null;
    const payload = await fetchJson(gitlabMergedEndpoint, { Authorization: `Bearer ${gitlabToken}` });
    const mrs = Array.isArray(payload) ? (payload as GitLabMergeRequest[]) : [];
    const count = mrs.length;
    const items: StatusItem[] = [
      {
        id: 'merged14',
        label: `Merged (last ${MERGED_LOOKBACK_DAYS}d)`,
        value: String(count),
        href: buildGitLabFilterUrl({
          state: 'merged',
          updated_after: mergedSince.toISOString()
        })
      }
    ];
    const highlights: StatusHighlight[] = mrs
      .slice()
      .sort(
        (a, b) =>
          new Date(b.merged_at ?? b.updated_at).getTime() -
          new Date(a.merged_at ?? a.updated_at).getTime()
      )
      .slice(0, 4)
      .map((mr) => ({
        title: mr.title,
        url: mr.web_url,
        meta: `${mr.source_branch} → ${mr.target_branch}`,
        badge: 'Merged',
        updatedAt: mr.merged_at ?? mr.updated_at,
        tags: ['Merged'],
        sourceBranch: mr.source_branch,
        targetBranch: mr.target_branch,
        reviewers: mr.reviewers?.map((reviewer) => reviewer.name).filter(Boolean),
        labels: mr.labels?.map((label) => label.title).filter(Boolean)
      }));
    return {
      id: 'gitlab-merged',
      title: `Merged in last ${MERGED_LOOKBACK_DAYS} days`,
      description: '',
      items,
      highlights
    };
  });

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

            const next = status.transform ? { ...status, ...status.transform(payload, status) } : status;
            if (status.id === 'gitlab' && next.highlights && onHighlightsChange) {
              onHighlightsChange(next.highlights);
            }
            return next;
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
    <Card className="overflow-hidden rounded-[20px] border border-white/50 bg-white/60 shadow-[0_30px_70px_rgba(15,23,42,0.16)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
      <CardHeader className="space-y-4 pb-4">
        <div>
          <CardTitle className="text-lg font-semibold text-[#0F172A] dark:text-[#F1F5F9]">GitLab Focus</CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
            Quick pulse on blockers and highlights across your assigned merge requests.
          </CardDescription>
        </div>
        <div className="h-px w-full rounded-full bg-gradient-to-r from-[#3A7AFE]/40 via-white/10 to-transparent dark:from-[#3A7AFE]/30" />
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
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
                  className="inline-flex min-w-[150px] flex-1 items-center justify-between gap-3 rounded-[14px] border border-white/40 bg-white/70 px-4 py-3 text-left shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur-lg transition hover:-translate-y-[3px] hover:border-[#3A7AFE]/70 dark:border-white/10 dark:bg-white/10"
                >
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{item.label}</dt>
                    <dd>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${getMetricAccent(item.id)}`}>
                        {item.value}
                      </span>
                    </dd>
                  </div>
                  <span aria-hidden="true" className="text-slate-400 dark:text-slate-500">
                    ↗
                  </span>
                </a>
              ))}
            </div>

            {!!status.highlights?.length && (
              <div className="space-y-3">
                {status.highlights.map((highlight, index) => (
                  <HighlightRow key={`${highlight.title}-${highlight.url ?? 'local'}-${index}`} highlight={highlight} />
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
                className="inline-flex items-center gap-1 rounded-full border border-white/40 bg-white/70 px-3 py-1 font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.12)] backdrop-blur-lg transition hover:-translate-y-[2px] hover:border-[#3A7AFE] hover:text-[#3A7AFE] dark:border-white/10 dark:bg-white/10 dark:text-[#F1F5F9]"
              >
                View all in GitLab ↗
              </a>
            </div>
          </section>
        ))}
        {gitlabToken && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
                  Recently merged
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Peek at wins from the last {MERGED_LOOKBACK_DAYS} days.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadMerged}
                disabled={mergedLoading}
                className="rounded-full border-[#E2E8F0] bg-white/70 px-3 py-1 text-xs text-[#0F172A] shadow-sm backdrop-blur dark:border-[#4B5563] dark:bg-[#1E293B]/60 dark:text-[#F1F5F9]"
              >
                {mergedStatus ? 'Hide' : mergedLoading ? 'Loading…' : 'Show merged'}
              </Button>
            </div>
            {mergedError && (
              <p className="text-xs text-rose-500 dark:text-rose-300">{mergedError}</p>
            )}
            {mergedStatus && (
              <>
                <div className="flex flex-wrap gap-2 text-sm">
                  {mergedStatus.items.map((item) => (
                    <a
                      key={item.id}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-w-[150px] flex-1 items-center justify-between gap-3 rounded-[14px] border border-white/40 bg-white/70 px-4 py-3 text-left shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur-lg transition hover:-translate-y-[3px] hover:border-[#3A7AFE]/70 dark:border-white/10 dark:bg-white/10"
                    >
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {item.label}
                        </dt>
                        <dd>
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${getMetricAccent(item.id)}`}>
                            {item.value}
                          </span>
                        </dd>
                      </div>
                      <span aria-hidden="true" className="text-slate-400 dark:text-slate-500">
                        ↗
                      </span>
                    </a>
                  ))}
                </div>
                <div className="space-y-3">
                  {mergedStatus.highlights?.map((highlight, index) => (
                    <HighlightRow
                      key={`${highlight.title}-${highlight.url ?? 'local'}-merged-${index}`}
                      highlight={highlight}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        )}
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
      reviewers: mr.reviewers?.map((reviewer) => reviewer.name).filter(Boolean),
      labels: mr.labels?.map((label) => label.title).filter(Boolean),
      isStale: new Date(mr.updated_at).getTime() < staleThreshold,
      hasConflicts: mr.merge_status === 'cannot_be_merged'
    }));

  return { metrics, highlights };
}

type GitLabFilterParams = Record<string, string>;

export function buildGitLabFilterUrl(params: GitLabFilterParams) {
  const base = gitlabProjectNamespace
    ? `https://gitlab.com/${gitlabProjectNamespace}/-/merge_requests`
    : 'https://gitlab.com/dashboard/merge_requests';
  const baseQuery: GitLabFilterParams = {
    state: 'opened',
    sort: 'created_date',
    first_page_size: '20'
  };
  if (gitlabUsername) {
    baseQuery['assignee_username[]'] = gitlabUsername;
  } else {
    baseQuery.scope = 'assigned_to_me';
  }
  const query = new URLSearchParams({ ...baseQuery, ...params });
  return `${base}?${query.toString()}`;
}

function buildDefaultGitLabApiUrl(overrides?: GitLabFilterParams) {
  const params = new URLSearchParams({
    state: 'opened',
    order_by: 'updated_at',
    sort: 'desc',
    per_page: '40'
  });
  if (gitlabUsername) {
    params.set('scope', 'all');
    params.append('assignee_username[]', gitlabUsername);
  } else {
    params.set('scope', 'assigned_to_me');
  }
  if (overrides) {
    Object.entries(overrides).forEach(([key, value]) => {
      params.set(key, value);
    });
  }
  return `https://gitlab.com/api/v4/merge_requests?${params.toString()}`;
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

function getMetricAccent(id: string) {
  const normalized = id.toLowerCase();
  if (normalized.includes('conflict')) {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-100';
  }
  if (normalized.includes('pipeline')) {
    return 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-100';
  }
  if (normalized.includes('stale')) {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100';
  }
  if (normalized.includes('merged')) {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100';
  }
  return 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white';
}

function HighlightRow({ highlight }: { highlight: StatusHighlight }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`flex flex-col gap-2 rounded-[14px] border border-white/35 bg-white/60 px-4 py-4 text-left text-sm text-[#0F172A] shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur-lg transition hover:-translate-y-[3px] hover:border-[#3A7AFE]/70 hover:text-[#3A7AFE] dark:border-white/10 dark:bg-white/5 dark:text-[#F1F5F9] ${
        highlight.hasConflicts ? 'border-l-4 border-l-rose-200/70 pl-5 dark:border-l-rose-400/40' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <a
          href={highlight.url}
          target={highlight.url ? '_blank' : undefined}
          rel={highlight.url ? 'noreferrer' : undefined}
          className="flex-1"
        >
          <p className="line-clamp-1 font-semibold">{highlight.title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-300">{highlight.meta}</p>
        </a>
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
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#E2E8F0] bg-white/70 text-xs text-slate-600 transition hover:border-[#3A7AFE] hover:text-[#3A7AFE] dark:border-[#4B5563] dark:bg-[#1E293B]/65"
            aria-expanded={expanded}
            aria-label={expanded ? 'Hide details' : 'Show details'}
          >
            {expanded ? '▴' : '▾'}
          </button>
        </div>
      </div>
      {highlight.updatedAt && (
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
          Updated {formatRelativeTime(highlight.updatedAt)}
        </p>
      )}
      {expanded && (
        <div className="space-y-1 rounded-[10px] border border-[#E2E8F0] bg-white/70 px-3 py-2 text-xs text-slate-600 shadow-inner dark:border-[#4B5563] dark:bg-[#1E293B]/60 dark:text-slate-200">
          <p className="flex items-center justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-300">Branches</span>
            <span className="font-semibold text-[#0F172A] dark:text-white">
              {highlight.sourceBranch} → {highlight.targetBranch}
            </span>
          </p>
          {highlight.pipelineStatus && (
            <p className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-300">Pipeline</span>
              <span className="font-semibold capitalize text-[#0F172A] dark:text-white">{highlight.pipelineStatus}</span>
            </p>
          )}
          {highlight.reviewers?.length ? (
            <p className="flex items-start gap-2">
              <span className="text-slate-500 dark:text-slate-300">Reviewers</span>
              <span className="flex-1 text-[#0F172A] dark:text-white">{highlight.reviewers.join(', ')}</span>
            </p>
          ) : null}
          {highlight.labels?.length ? (
            <div className="flex flex-wrap gap-1">
              {highlight.labels.map((label) => (
                <span
                  key={`${highlight.title}-label-${label}`}
                  className="rounded-full bg-[#E6F0FF] px-2 py-1 text-[11px] font-semibold text-[#3A7AFE] dark:bg-[#1E3A8A] dark:text-white"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
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
