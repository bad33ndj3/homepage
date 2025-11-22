import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import linksConfig from '../config/links.json';
import { Card } from '../components/Card';

const providers = [
  { label: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  { label: 'Google', url: 'https://www.google.com/search?q=' },
  { label: 'Perplexity', url: 'https://www.perplexity.ai/search?q=' }
];

type LinkConfig = {
  label: string;
  description: string;
  url: string;
};

const favoriteLinks: LinkConfig[] = linksConfig as LinkConfig[];

export function SearchBar() {
  const [engine, setEngine] = useState(providers[0]);
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredLinks = normalizedQuery
    ? favoriteLinks.filter(
        (link) =>
          link.label.toLowerCase().includes(normalizedQuery) ||
          link.description.toLowerCase().includes(normalizedQuery)
      )
    : favoriteLinks;

  const visibleLinks = useMemo(() => {
    if (normalizedQuery) return filteredLinks;
    return showAll ? filteredLinks : filteredLinks.slice(0, 8);
  }, [filteredLinks, normalizedQuery, showAll]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!normalizedQuery) return;

    if (filteredLinks.length) {
      window.open(filteredLinks[0].url, '_blank');
      return;
    }

    const url = `${engine.url}${encodeURIComponent(query)}`;
    window.open(url, '_blank');
  };

  const handleWebSearch = () => {
    if (!normalizedQuery) return;
    const url = `${engine.url}${encodeURIComponent(query)}`;
    window.open(url, '_blank');
  };

  return (
    <Card title="Search & Links" subtitle="Filter quick links first, then jump to the web">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3"
      >
        <select
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-white/15 dark:bg-white/10 dark:text-white sm:w-auto"
          value={engine.label}
          onChange={(event) => {
            const selected = providers.find((p) => p.label === event.target.value);
            if (selected) setEngine(selected);
          }}
        >
          {providers.map((provider) => (
            <option key={provider.label} value={provider.label} className="bg-slate-800 text-white">
              {provider.label}
            </option>
          ))}
        </select>
        <input
          ref={inputRef}
          className="w-full flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base text-slate-900 outline-none focus:border-accent dark:border-white/15 dark:bg-slate-900/60 dark:text-white"
          placeholder={`Search ${engine.label}`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button
          type="submit"
          className="rounded-xl bg-accent px-5 py-2 text-sm font-medium text-slate-900 transition hover:brightness-110 sm:text-base"
        >
          Open match
        </button>
        <button
          type="button"
          onClick={handleWebSearch}
          className="rounded-xl border border-slate-200 px-5 py-2 text-sm text-slate-900 transition hover:border-accent dark:border-white/15 dark:text-white sm:text-base"
        >
          Web search
        </button>
      </form>
      <div className="mt-4 space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {normalizedQuery ? `Matches (${filteredLinks.length})` : 'Pinned links'}
        </p>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {visibleLinks.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="group rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm transition hover:border-accent hover:bg-white dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{link.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-300">{link.description}</p>
            </a>
          ))}
          {!filteredLinks.length && (
            <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
              No pinned links found. Press “Web search” to look online.
            </p>
          )}
        </div>
        {!normalizedQuery && filteredLinks.length > 8 && (
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-accent dark:text-slate-300"
          >
            {showAll ? 'Show less' : 'Show more'}
            <span className={`text-base leading-none ${showAll ? 'rotate-180' : ''}`}>⌄</span>
          </button>
        )}
      </div>
    </Card>
  );
}
