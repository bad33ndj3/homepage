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
  showValue?: boolean;
};

type ReviewState = {
  reviewed?: boolean;
  commented?: boolean;
  commentsResolved?: boolean;
  approved?: boolean;
};

type ReviewCategory = 'needs-review' | 'in-review' | 'reviewed';

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
  projectId?: number;
  iid?: number;
  reviewState?: ReviewState;
  reviewCategory?: ReviewCategory;
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
  iid: number;
  project_id: number;
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
  approved_by?: Array<{
    id?: number;
    username?: string;
    name?: string;
    user?: { id?: number; username?: string; name?: string };
  }>;
  user_notes_count?: number;
  blocking_discussions_resolved?: boolean;
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
const gitlabApiBase = deriveGitLabApiBase(gitlabEndpoint);
const MERGED_LOOKBACK_DAYS = 14;
const mergedSince = new Date(Date.now() - MERGED_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
const gitlabMergedEndpoint = gitlabToken
  ? buildDefaultGitLabApiUrl({
      state: 'merged',
      updated_after: mergedSince.toISOString(),
      order_by: 'updated_at'
    })
  : undefined;
const gitlabReviewerEndpoint =
  gitlabToken && gitlabUsername
    ? buildDefaultGitLabApiUrl(undefined, { role: 'reviewer' })
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
      { id: 'open', label: 'Open', value: '–', showValue: false },
      { id: 'stale', label: 'Stale >48h', value: '–', showValue: false },
      { id: 'pipeline', label: 'Pipeline failing', value: '–', showValue: false },
      { id: 'conflicts', label: 'Conflicts', value: '–', showValue: false }
      ],
    highlights: [],
    transform: (payload) => {
      const mrs = Array.isArray(payload) ? (payload as GitLabMergeRequest[]) : [];
      const { metrics, highlights } = buildGitLabInsights(mrs);
      return { items: metrics, highlights };
    }
  }
] as RemoteStatus[];

const defaultReviewerStatus: RemoteStatus | null = gitlabReviewerEndpoint
  ? {
      id: 'gitlab-reviewer',
      title: 'Reviewer queue',
      description: 'MRs where you are a reviewer. Compact cues for approvals and open threads.',
      apiUrl: gitlabReviewerEndpoint,
      headers: gitlabToken ? { Authorization: `Bearer ${gitlabToken}` } : undefined,
      envVar: gitlabToken ? undefined : 'VITE_GITLAB_TOKEN',
      items: [
        { id: 'needs-review', label: 'Needs review', value: '–', showValue: false, href: buildGitLabReviewerFilterUrl({ reviewer_approved_by_me: 'no', with_notes: 'false' }) },
        { id: 'in-review', label: 'In review', value: '–', showValue: false, href: buildGitLabReviewerFilterUrl({ reviewer_approved_by_me: 'no', with_notes: 'yes' }) },
        { id: 'reviewed', label: 'Reviewed', value: '–', showValue: false, href: buildGitLabReviewerFilterUrl({ reviewer_approved_by_me: 'yes', resolved: 'yes' }) }
      ],
      highlights: []
    }
  : null;

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

type TabType = 'assigned' | 'reviewer' | 'merged';

type TabIndicator = 'red' | 'amber' | 'none';

export function StatusBoard({ onHighlightsChange }: StatusBoardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('assigned');
  const [statuses, setStatuses] = useState(defaultStatuses);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewerStatus, setReviewerStatus] = useState<RemoteStatus | null>(defaultReviewerStatus);
  const [reviewerLoading, setReviewerLoading] = useState(false);
  const [reviewerError, setReviewerError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!gitlabReviewerEndpoint || !gitlabToken || !reviewerStatus) return;

    let cancelled = false;
    const fetchReviewer = async () => {
      setReviewerLoading(true);
      setReviewerError(null);
      try {
        const payload = await fetchJson(gitlabReviewerEndpoint, { Authorization: `Bearer ${gitlabToken}` });
        const mrs = Array.isArray(payload) ? (payload as GitLabMergeRequest[]) : [];
        const { metrics, highlights } = await buildReviewerInsights(mrs);
        if (cancelled) return;
        setReviewerStatus((prev) =>
          prev
            ? {
                ...prev,
                items: metrics,
                highlights
              }
            : null
        );
      } catch (err) {
        if (!cancelled) {
          setReviewerError((err as Error).message);
        }
      } finally {
        if (!cancelled) {
          setReviewerLoading(false);
        }
      }
    };

    fetchReviewer();
    return () => {
      cancelled = true;
    };
  }, [gitlabReviewerEndpoint, gitlabToken]);

  // Calculate tab indicators and counts
  const assignedHighlights = statuses[0]?.highlights || [];
  const assignedCount = assignedHighlights.length;
  const assignedIndicator: TabIndicator = assignedHighlights.some(
    (h) => h.hasConflicts || h.pipelineStatus === 'failed'
  )
    ? 'red'
    : assignedHighlights.some((h) => h.isStale)
    ? 'amber'
    : 'none';

  const reviewerHighlights = reviewerStatus?.highlights || [];
  const reviewerCount = reviewerHighlights.length;
  const reviewerIndicator: TabIndicator = reviewerHighlights.some(
    (h) => h.hasConflicts || h.pipelineStatus === 'failed'
  )
    ? 'red'
    : reviewerHighlights.some((h) => h.reviewState?.commentsResolved === false)
    ? 'amber'
    : 'none';

  const mergedHighlights = mergedStatus?.highlights || [];
  const mergedCount = mergedHighlights.length;
  const mergedIndicator: TabIndicator = 'none'; // Merged items are always "none" priority

  // Auto-load merged when tab is clicked
  useEffect(() => {
    if (activeTab === 'merged' && !mergedStatus && !mergedLoading && gitlabToken) {
      loadMerged();
    }
  }, [activeTab, mergedStatus, mergedLoading, gitlabToken, loadMerged]);

  // Helper to render indicator dot
  const renderIndicator = (indicator: TabIndicator) => {
    if (indicator === 'none') return null;
    const color = indicator === 'red' ? 'bg-rose-500' : 'bg-amber-500';
    return <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />;
  };

  // Helper to render tab button
  const renderTab = (
    type: TabType,
    label: string,
    count: number,
    indicator: TabIndicator
  ) => {
    const isActive = activeTab === type;
    return (
      <button
        key={type}
        type="button"
        onClick={() => setActiveTab(type)}
        className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
          isActive
            ? 'bg-[#0F172A] text-white shadow-[0_8px_16px_rgba(15,23,42,0.3)] dark:bg-white dark:text-[#0F172A]'
            : 'text-slate-600 hover:bg-white/60 hover:text-[#0F172A] dark:text-slate-300 dark:hover:bg-white/10'
        }`}
      >
        {renderIndicator(indicator)}
        <span>{label}</span>
        <span className={`text-xs ${isActive ? 'opacity-70' : 'opacity-50'}`}>({count})</span>
      </button>
    );
  };

  return (
    <Card className="group overflow-hidden rounded-[20px] border border-white/40 bg-white/40 shadow-[0_8px_32px_rgba(31,38,135,0.2)] backdrop-blur-2xl backdrop-saturate-150 transition-all hover:border-white/50 hover:bg-white/50 dark:border-white/20 dark:bg-black/40 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
      <CardHeader className="space-y-3 px-4 pb-3 pt-4 lg:space-y-4 lg:px-6 lg:pb-4 lg:pt-6">
        <div>
          <CardTitle className="text-base font-semibold text-[#0F172A] lg:text-lg dark:text-[#F1F5F9]">
            GitLab Focus
          </CardTitle>
          <CardDescription className="text-[11px] text-slate-500 lg:text-xs dark:text-slate-400">
            {activeTab === 'assigned' && 'Your assigned merge requests'}
            {activeTab === 'reviewer' && 'MRs where you are a reviewer'}
            {activeTab === 'merged' && 'Recently merged in last 14 days'}
          </CardDescription>
        </div>

        {/* Segmented Control */}
        <div className="flex flex-wrap gap-2 rounded-full border border-white/25 bg-white/10 p-1.5 backdrop-blur-md backdrop-saturate-150 dark:border-white/10 dark:bg-black/20">
          {renderTab('assigned', 'Assigned', assignedCount, assignedIndicator)}
          {gitlabUsername && renderTab('reviewer', 'Reviewer', reviewerCount, reviewerIndicator)}
          {gitlabToken && renderTab('merged', 'Merged', mergedCount, mergedIndicator)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pt-0 lg:px-6">
        {/* Assigned Tab */}
        {activeTab === 'assigned' && (
          <>
            {!gitlabToken && (
              <p className="rounded-xl border border-dashed border-amber-200 px-3 py-2 text-xs text-amber-600 dark:border-amber-300/40 dark:text-amber-300">
                Add VITE_GITLAB_TOKEN to your .env file to enable live data.
              </p>
            )}

            {loading && <p className="text-sm text-slate-500 dark:text-slate-300">Loading assigned MRs…</p>}

            {error && <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}

            {assignedHighlights.length > 0 ? (
              <div className="space-y-2">
                {assignedHighlights.map((highlight, index) => (
                  <HighlightRow key={`assigned-${highlight.title}-${index}`} highlight={highlight} />
                ))}
              </div>
            ) : !loading && gitlabToken && (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                No assigned merge requests found.
              </p>
            )}

            {gitlabToken && (
              <div className="flex justify-end pt-2">
                <a
                  href={buildGitLabFilterUrl({})}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1 rounded-full border border-white/40 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.12)] backdrop-blur-lg transition hover:-translate-y-[2px] hover:border-[#3A7AFE] hover:text-[#3A7AFE] dark:border-white/10 dark:bg-white/10 dark:text-[#F1F5F9]"
                >
                  View all in GitLab ↗
                </a>
              </div>
            )}
          </>
        )}

        {/* Reviewer Tab */}
        {activeTab === 'reviewer' && (
          <>
            {!gitlabUsername && (
              <p className="rounded-xl border border-dashed border-amber-200/60 bg-amber-50/60 px-3 py-2 text-xs text-amber-700 dark:border-amber-300/30 dark:bg-amber-500/10 dark:text-amber-200">
                <span className="font-semibold">Add VITE_GITLAB_USERNAME</span> to your .env file to see reviewer queue.
              </p>
            )}

            {reviewerLoading && <p className="text-sm text-slate-500 dark:text-slate-300">Loading reviewer queue…</p>}

            {reviewerError && <p className="text-sm text-rose-600 dark:text-rose-300">{reviewerError}</p>}

            {reviewerHighlights.length > 0 ? (
              <div className="space-y-2">
                {reviewerHighlights.map((highlight, index) => (
                  <ReviewHighlightRow key={`reviewer-${highlight.title}-${index}`} highlight={highlight} />
                ))}
              </div>
            ) : !reviewerLoading && gitlabUsername && (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                No MRs in your reviewer queue.
              </p>
            )}

            {gitlabUsername && (
              <div className="flex justify-end pt-2">
                <a
                  href={buildGitLabReviewerFilterUrl({})}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1 rounded-full border border-white/40 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.12)] backdrop-blur-lg transition hover:-translate-y-[2px] hover:border-[#3A7AFE] hover:text-[#3A7AFE] dark:border-white/10 dark:bg-white/10 dark:text-[#F1F5F9]"
                >
                  View all in GitLab ↗
                </a>
              </div>
            )}
          </>
        )}

        {/* Merged Tab */}
        {activeTab === 'merged' && (
          <>
            {mergedLoading && <p className="text-sm text-slate-500 dark:text-slate-300">Loading recently merged…</p>}

            {mergedError && <p className="text-sm text-rose-600 dark:text-rose-300">{mergedError}</p>}

            {mergedHighlights.length > 0 ? (
              <div className="space-y-2">
                {mergedHighlights.map((highlight, index) => (
                  <HighlightRow key={`merged-${highlight.title}-${index}`} highlight={highlight} />
                ))}
              </div>
            ) : !mergedLoading && mergedStatus && (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                No recently merged MRs in the last {MERGED_LOOKBACK_DAYS} days.
              </p>
            )}

            {gitlabToken && mergedStatus && (
              <div className="flex justify-end pt-2">
                <a
                  href={buildGitLabFilterUrl({ state: 'merged', updated_after: mergedSince.toISOString() })}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1 rounded-full border border-white/40 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.12)] backdrop-blur-lg transition hover:-translate-y-[2px] hover:border-[#3A7AFE] hover:text-[#3A7AFE] dark:border-white/10 dark:bg-white/10 dark:text-[#F1F5F9]"
                >
                  View all in GitLab ↗
                </a>
              </div>
            )}
          </>
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
    .sort((a, b) => {
      const priorityDiff =
        getAssignedPriorityScore(b, staleThreshold) - getAssignedPriorityScore(a, staleThreshold);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    })
    .slice(0, 10)
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

function getAssignedPriorityScore(mr: GitLabMergeRequest, staleThreshold: number) {
  let score = 0;
  if (mr.head_pipeline?.status === 'failed') score += 3;
  if (mr.merge_status === 'cannot_be_merged') score += 3;
  if (new Date(mr.updated_at).getTime() < staleThreshold) score += 2;
  if (mr.draft || mr.work_in_progress) score -= 1;
  return score;
}

async function buildReviewerInsights(mrs: GitLabMergeRequest[]) {
  const unresolved = mrs.filter((mr) => mr.blocking_discussions_resolved === false).length;
  const approved = mrs.filter((mr) => hasUserApproved(mr)).length;

  const staleThreshold = Date.now() - 1000 * 60 * 60 * 48;
  const baseHighlights: StatusHighlight[] = mrs
    .slice()
    .sort((a, b) => {
      const categoryOrder: Record<ReviewCategory, number> = {
        'needs-review': 0,
        'in-review': 1,
        reviewed: 2
      };
      const catB = categoryOrder[getReviewCategory({
        approved: hasUserApproved(b),
        commented: typeof b.user_notes_count === 'number' ? b.user_notes_count > 0 : undefined,
        commentsResolved: b.blocking_discussions_resolved
      })];
      const catA = categoryOrder[getReviewCategory({
        approved: hasUserApproved(a),
        commented: typeof a.user_notes_count === 'number' ? a.user_notes_count > 0 : undefined,
        commentsResolved: a.blocking_discussions_resolved
      })];
      if (catA !== catB) return catA - catB;
      const priorityDiff =
        getAssignedPriorityScore(b, staleThreshold) - getAssignedPriorityScore(a, staleThreshold);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    })
    .map((mr) => {
      const reviewState: ReviewState = {
        approved: hasUserApproved(mr),
        commented: typeof mr.user_notes_count === 'number' ? mr.user_notes_count > 0 : undefined,
        commentsResolved: mr.blocking_discussions_resolved,
        reviewed: undefined
      };
      const hasConflicts = mr.merge_status === 'cannot_be_merged';
      const pipelineFailed = mr.head_pipeline?.status === 'failed';
      const reviewCategory = getReviewCategory(reviewState);
      return {
        title: mr.title,
        url: mr.web_url,
        meta: `${mr.source_branch} → ${mr.target_branch}`,
        badge: pipelineFailed ? 'Pipeline failed' : hasConflicts ? 'Conflicts' : undefined,
        tags: buildReviewTags({
          reviewState,
          pipelineFailed,
          hasConflicts,
          reviewCategory
        }),
        updatedAt: mr.updated_at,
        sourceBranch: mr.source_branch,
        targetBranch: mr.target_branch,
        pipelineStatus: mr.head_pipeline?.status,
        reviewers: mr.reviewers?.map((reviewer) => reviewer.name).filter(Boolean),
        labels: mr.labels?.map((label) => label.title).filter(Boolean),
        projectId: mr.project_id,
        iid: mr.iid,
        hasConflicts,
        reviewState,
        reviewCategory
      };
    });

  const highlights = await annotateReviewerHighlights(baseHighlights);
  const categoryCounts = highlights.reduce(
    (acc, highlight) => {
      const category = highlight.reviewCategory ?? getReviewCategory(highlight.reviewState);
      acc[category] += 1;
      return acc;
    },
    {
      'needs-review': 0,
      'in-review': 0,
      reviewed: 0
    } as Record<ReviewCategory, number>
  );

  const metrics: StatusItem[] = [
    {
      id: 'needs-review',
      label: 'Needs review',
      value: String(categoryCounts['needs-review']),
      showValue: false,
      href: buildGitLabReviewerFilterUrl({ reviewer_approved_by_me: 'no', with_notes: 'false' })
    },
    {
      id: 'in-review',
      label: 'In review',
      value: String(categoryCounts['in-review']),
      showValue: false,
      href: buildGitLabReviewerFilterUrl({ reviewer_approved_by_me: 'no', with_notes: 'yes' })
    },
    {
      id: 'reviewed',
      label: 'Reviewed',
      value: String(categoryCounts.reviewed),
      showValue: false,
      href: buildGitLabReviewerFilterUrl({ reviewer_approved_by_me: 'yes', resolved: 'yes' })
    }
  ];
  return { metrics, highlights };
}

function hasUserApproved(mr: GitLabMergeRequest) {
  if (!gitlabUsername || !mr.approved_by) return false;
  return mr.approved_by.some((entry) => {
    const user = entry.user ?? entry;
    return user?.username === gitlabUsername;
  });
}

function buildReviewTags({
  reviewState,
  pipelineFailed,
  hasConflicts,
  reviewCategory
}: {
  reviewState: ReviewState;
  pipelineFailed?: boolean;
  hasConflicts?: boolean;
  reviewCategory?: ReviewCategory;
}) {
  const tags: string[] = [];
  if (pipelineFailed) tags.push('Pipeline');
  if (hasConflicts) tags.push('Conflicts');
  if (reviewState.approved) tags.push('Approved');
  if (reviewState.commented && !reviewState.approved) tags.push('Commented');
  if (reviewState.commentsResolved === false) tags.push('Unresolved');
  if (reviewState.commentsResolved && (reviewState.approved || reviewState.commented)) {
    tags.push('Resolved');
  }
  if (reviewCategory === 'needs-review') tags.push('Needs review');
  if (reviewCategory === 'in-review') tags.push('In review');
  if (reviewCategory === 'reviewed') tags.push('Reviewed');
  return tags;
}

async function annotateReviewerHighlights(highlights: StatusHighlight[]) {
  if (!gitlabToken || !gitlabUsername) return highlights;
  const requests = highlights.map(async (highlight) => {
    if (!highlight.projectId || !highlight.iid) return highlight;

    let commented = highlight.reviewState?.commented ?? false;
    let commentsResolved = highlight.reviewState?.commentsResolved;

    try {
      const notes = await fetchJson(
        `${gitlabApiBase}/projects/${encodeURIComponent(String(highlight.projectId))}/merge_requests/${highlight.iid}/notes?author_username=${gitlabUsername}&per_page=1`,
        { Authorization: `Bearer ${gitlabToken}` }
      );
      commented = Array.isArray(notes) && notes.length > 0;
    } catch {
      commented = highlight.reviewState?.commented ?? false;
    }

    if (commentsResolved === undefined) {
      try {
        const discussions = await fetchJson(
          `${gitlabApiBase}/projects/${encodeURIComponent(String(highlight.projectId))}/merge_requests/${highlight.iid}/discussions?per_page=1&resolved=false`,
          { Authorization: `Bearer ${gitlabToken}` }
        );
        commentsResolved = !(Array.isArray(discussions) && discussions.length > 0);
      } catch {
        commentsResolved = highlight.reviewState?.commentsResolved;
      }
    }

    const reviewed = commented || highlight.reviewState?.approved;
    const updatedReviewState: ReviewState = {
      ...highlight.reviewState,
      commented,
      commentsResolved,
      reviewed
    };
    const reviewCategory = getReviewCategory(updatedReviewState);
    return {
      ...highlight,
      reviewState: updatedReviewState,
      tags: buildReviewTags({
        reviewState: updatedReviewState,
        pipelineFailed: highlight.pipelineStatus === 'failed',
        hasConflicts: highlight.hasConflicts,
        reviewCategory
      }),
      reviewCategory
    };
  });

  return Promise.all(requests);
}

function getReviewCategory(reviewState?: ReviewState): ReviewCategory {
  if (!reviewState) return 'needs-review';
  if (reviewState.approved && reviewState.commentsResolved !== false) {
    return 'reviewed';
  }
  if (reviewState.commented && !reviewState.approved) {
    return 'in-review';
  }
  if (reviewState.approved && reviewState.commentsResolved === false) {
    return 'in-review';
  }
  return 'needs-review';
}

function getCategoryReason(category: ReviewCategory) {
  if (category === 'needs-review') return 'No review or approval from you yet.';
  if (category === 'in-review') return 'You left comments but have not approved (or threads remain).';
  return 'You approved and no open threads from you remain.';
}

function getCategoryAccentBorder(category: ReviewCategory) {
  if (category === 'needs-review') return 'border-l-4 border-l-amber-300/80';
  if (category === 'in-review') return 'border-l-4 border-l-sky-300/80';
  return 'border-l-4 border-l-emerald-300/80';
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

export function buildGitLabReviewerFilterUrl(params: GitLabFilterParams) {
  const base = gitlabProjectNamespace
    ? `https://gitlab.com/${gitlabProjectNamespace}/-/merge_requests`
    : 'https://gitlab.com/dashboard/merge_requests';
  const baseQuery: GitLabFilterParams = {
    state: 'opened',
    sort: 'created_date',
    first_page_size: '20'
  };
  if (gitlabUsername) {
    baseQuery.reviewer_username = gitlabUsername;
  } else {
    baseQuery.scope = 'all';
  }
  const query = new URLSearchParams({ ...baseQuery, ...params });
  return `${base}?${query.toString()}`;
}

function buildDefaultGitLabApiUrl(overrides?: GitLabFilterParams, options?: { role?: 'assignee' | 'reviewer' }) {
  const params = new URLSearchParams({
    state: 'opened',
    order_by: 'updated_at',
    sort: 'desc',
    per_page: '40',
    with_merge_status_recheck: 'true',
    with_pipeline_status: 'true'
  });
  const role = options?.role ?? 'assignee';
  if (role === 'reviewer') {
    if (gitlabUsername) {
      params.set('scope', 'all');
      params.append('reviewer_username', gitlabUsername);
    }
  } else {
    if (gitlabUsername) {
      params.set('scope', 'all');
      params.append('assignee_username[]', gitlabUsername);
    } else {
      params.set('scope', 'assigned_to_me');
    }
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
  if (normalized.includes('approved') || normalized.includes('resolved')) {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100';
  }
  if (normalized.includes('in review')) {
    return 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-100';
  }
  if (normalized.includes('needs review') || normalized.includes('unresolved')) {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-400/20 dark:text-amber-100';
  }
  if (normalized.includes('draft')) {
    return 'bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-white';
  }
  return 'bg-white/80 text-slate-800 dark:bg-white/10 dark:text-white';
}

function getMetricAccent(id: string) {
  const normalized = id.toLowerCase();
  if (normalized.includes('needs-review')) {
    return 'bg-gradient-to-r from-amber-100 via-white to-white text-amber-900 border border-amber-200/80';
  }
  if (normalized.includes('in-review')) {
    return 'bg-gradient-to-r from-sky-100 via-white to-white text-sky-900 border border-sky-200/80';
  }
  if (normalized.includes('reviewed')) {
    return 'bg-gradient-to-r from-emerald-100 via-white to-white text-emerald-900 border border-emerald-200/80';
  }
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
      className={`flex flex-col gap-2 rounded-[12px] border border-white/35 bg-white/60 px-3 py-2.5 text-left text-sm text-[#0F172A] shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur-lg transition hover:-translate-y-[2px] hover:border-[#3A7AFE]/70 hover:text-[#3A7AFE] dark:border-white/10 dark:bg-white/5 dark:text-[#F1F5F9] 2xl:gap-3 2xl:px-4 2xl:py-3 ${
        highlight.hasConflicts ? 'border-l-4 border-l-rose-200/70 pl-4 2xl:pl-5 dark:border-l-rose-400/40' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <a
          href={highlight.url}
          target={highlight.url ? '_blank' : undefined}
          rel={highlight.url ? 'noreferrer' : undefined}
          className="flex-1 min-w-0"
        >
          <p className="font-semibold 2xl:text-base">{highlight.title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-300">{highlight.meta}</p>
          {highlight.updatedAt && (
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              Updated {formatRelativeTime(highlight.updatedAt)}
            </p>
          )}
        </a>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-1">
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

      {/* Always show metadata on 2xl screens, otherwise in expandable section */}
      <div className="hidden 2xl:grid 2xl:grid-cols-3 2xl:gap-4 2xl:text-xs">
        {highlight.pipelineStatus && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400">Pipeline:</span>
            <span className={`font-semibold capitalize ${
              highlight.pipelineStatus === 'failed' ? 'text-rose-600 dark:text-rose-400' :
              highlight.pipelineStatus === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
              'text-slate-700 dark:text-slate-200'
            }`}>{highlight.pipelineStatus}</span>
          </div>
        )}
        {highlight.reviewers?.length ? (
          <div className="flex items-center gap-2 col-span-2">
            <span className="text-slate-500 dark:text-slate-400">Reviewers:</span>
            <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{highlight.reviewers.join(', ')}</span>
          </div>
        ) : null}
        {highlight.labels?.length ? (
          <div className="col-span-3 flex flex-wrap gap-1.5">
            {highlight.labels.map((label) => (
              <span
                key={`${highlight.title}-label-${label}`}
                className="rounded-full bg-[#E6F0FF] px-2.5 py-1 text-[11px] font-semibold text-[#3A7AFE] dark:bg-[#1E3A8A] dark:text-white"
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Expandable section for smaller screens */}
      <div className="flex items-center justify-end 2xl:hidden">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#E2E8F0] bg-white/70 text-xs text-slate-600 transition hover:border-[#3A7AFE] hover:text-[#3A7AFE] dark:border-[#4B5563] dark:bg-[#1E293B]/65"
          aria-expanded={expanded}
          aria-label={expanded ? 'Hide details' : 'Show details'}
        >
          {expanded ? '▴' : '▾'}
        </button>
      </div>

      {expanded && (
        <div className="space-y-1 rounded-[10px] border border-[#E2E8F0] bg-white/70 px-3 py-2 text-xs text-slate-600 shadow-inner 2xl:hidden dark:border-[#4B5563] dark:bg-[#1E293B]/60 dark:text-slate-200">
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

function ReviewHighlightRow({ highlight }: { highlight: StatusHighlight }) {
  const [expanded, setExpanded] = useState(false);
  const review = highlight.reviewState ?? {};
  const category = highlight.reviewCategory ?? getReviewCategory(review);
  const categoryReason = getCategoryReason(category);
  const secondaryTags = highlight.tags?.filter((tag) => {
    const normalized = tag.toLowerCase();
    if (normalized.includes('needs review') || normalized.includes('in review') || normalized.includes('reviewed')) {
      return false;
    }
    return true;
  });

  return (
    <div
      className={`flex flex-col gap-2 rounded-[12px] border border-white/35 bg-white/70 px-3 py-2.5 text-left text-sm text-[#0F172A] shadow-[0_14px_30px_rgba(15,23,42,0.14)] backdrop-blur-lg transition hover:-translate-y-[2px] hover:border-[#3A7AFE]/70 dark:border-white/10 dark:bg-white/5 dark:text-[#F1F5F9] 2xl:gap-3 2xl:px-4 2xl:py-3 ${getCategoryAccentBorder(category)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <a
          href={highlight.url}
          target={highlight.url ? '_blank' : undefined}
          rel={highlight.url ? 'noreferrer' : undefined}
          className="flex-1 min-w-0"
        >
          <p className="font-semibold 2xl:text-base">{highlight.title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-300">{highlight.meta}</p>
          {highlight.updatedAt && (
            <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
              Updated {formatRelativeTime(highlight.updatedAt)}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-600 2xl:hidden dark:text-slate-200">{categoryReason}</p>
        </a>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-1">
          <Badge
            variant="secondary"
            className={getTagClass(category)}
            title={categoryReason}
          >
            {category === 'needs-review' ? 'Needs review' : category === 'in-review' ? 'In review' : 'Reviewed'}
          </Badge>
          {secondaryTags?.map((tag) => (
            <Badge key={`${highlight.title}-${tag}`} variant="secondary" className={getTagClass(tag)}>
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Always show metadata on 2xl screens */}
      <div className="hidden 2xl:block">
        <p className="mb-2 text-xs italic text-slate-600 dark:text-slate-300">{categoryReason}</p>
        <div className="grid grid-cols-3 gap-4 text-xs">
          {highlight.pipelineStatus && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">Pipeline:</span>
              <span className={`font-semibold capitalize ${
                highlight.pipelineStatus === 'failed' ? 'text-rose-600 dark:text-rose-400' :
                highlight.pipelineStatus === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
                'text-slate-700 dark:text-slate-200'
              }`}>{highlight.pipelineStatus}</span>
            </div>
          )}
          {highlight.reviewers?.length ? (
            <div className="col-span-2 flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">Reviewers:</span>
              <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{highlight.reviewers.join(', ')}</span>
            </div>
          ) : null}
          {highlight.labels?.length ? (
            <div className="col-span-3 flex flex-wrap gap-1.5">
              {highlight.labels.map((label) => (
                <span
                  key={`${highlight.title}-label-${label}`}
                  className="rounded-full bg-[#E6F0FF] px-2.5 py-1 text-[11px] font-semibold text-[#3A7AFE] dark:bg-[#1E3A8A] dark:text-white"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Expandable section for smaller screens */}
      <div className="flex items-center justify-end 2xl:hidden">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#E2E8F0] bg-white/70 text-xs text-slate-600 transition hover:border-[#3A7AFE] hover:text-[#3A7AFE] dark:border-[#4B5563] dark:bg-[#1E293B]/65"
          aria-expanded={expanded}
          aria-label={expanded ? 'Hide details' : 'Show details'}
        >
          {expanded ? '▴' : '▾'}
        </button>
      </div>

      {expanded && (
        <div className="space-y-1 rounded-[10px] border border-[#E2E8F0] bg-white/70 px-3 py-2 text-xs text-slate-600 shadow-inner 2xl:hidden dark:border-[#4B5563] dark:bg-[#1E293B]/60 dark:text-slate-200">
          <p className="flex items-center justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-300">Branches</span>
            <span className="font-semibold text-[#0F172A] dark:text-white">
              {highlight.sourceBranch} → {highlight.targetBranch}
            </span>
          </p>
          {highlight.pipelineStatus && (
            <p className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-300">Pipeline</span>
              <span className="font-semibold capitalize text-[#0F172A] dark:text-white">
                {highlight.pipelineStatus}
              </span>
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

function deriveGitLabApiBase(url: string | undefined) {
  if (!url) return 'https://gitlab.com/api/v4';
  try {
    const parsed = new URL(url);
    const trimmedPath = parsed.pathname.split('/merge_requests')[0] || parsed.pathname;
    return `${parsed.origin}${trimmedPath}`;
  } catch {
    return 'https://gitlab.com/api/v4';
  }
}
