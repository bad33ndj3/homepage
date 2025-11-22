import { Card } from '../components/Card';

const favoriteLinks = [
  { label: 'GitLab', description: 'Merge requests & pipelines', url: 'https://gitlab.com/' },
  { label: 'Jira', description: 'Boards & sprints', url: 'https://jira.atlassian.com/' },
  { label: 'v0.dev', description: 'AI generated UI blocks', url: 'https://v0.dev/' },
  { label: 'shadcn/ui', description: 'Component library reference', url: 'https://ui.shadcn.com/' },
  { label: 'Tailwind', description: 'Utility class docs', url: 'https://tailwindcss.com/docs' },
  { label: 'Codex CLI', description: 'Current agent environment', url: 'https://github.com/features/copilot' }
];

export function LinkTiles() {
  return (
    <Card title="Quick Links" subtitle="Pin the destinations you open 20x a day">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {favoriteLinks.map((link) => (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="group rounded-2xl border border-white/5 bg-white/5 px-4 py-5 transition hover:border-accent hover:bg-white/10"
          >
            <p className="text-base font-semibold text-white">{link.label}</p>
            <p className="text-sm text-slate-300">{link.description}</p>
            <span className="mt-3 inline-flex items-center text-xs font-medium text-accent">
              Open ↗
            </span>
          </a>
        ))}
      </div>
    </Card>
  );
}
