import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import linksConfig, { type LinkConfig } from '../config/links';

const providers = [
  { label: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  { label: 'Google', url: 'https://www.google.com/search?q=' },
  { label: 'Perplexity', url: 'https://www.perplexity.ai/search?q=' }
];

const favoriteLinks: LinkConfig[] = linksConfig;

type SearchBarProps = {
  autoFocus?: boolean;
};

export function SearchBarInner({ autoFocus = true }: SearchBarProps) {
  const [engine, setEngine] = useState(providers[0]);
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

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
    <Card className="rounded-[20px] border border-white/50 bg-white/60 shadow-[0_25px_70px_rgba(15,23,42,0.15)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
      <CardHeader className="space-y-2 pb-2">
        <CardTitle className="text-lg font-semibold text-[#0F172A] dark:text-[#F1F5F9]">Search & Links</CardTitle>
        <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
          Filter bookmarks instantly; no match launches your preferred search engine.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col gap-3 rounded-[18px] border border-white/40 bg-white/60 p-3 shadow-[inset_0_1px_15px_rgba(15,23,42,0.06)] backdrop-blur-2xl sm:flex-row sm:items-center">
            <Select
              value={engine.label}
              onValueChange={(value) => {
                const selected = providers.find((provider) => provider.label === value);
                if (selected) setEngine(selected);
              }}
            >
              <SelectTrigger className="h-12 w-full rounded-[14px] border-none bg-white/40 text-sm text-slate-600 ring-0 focus:ring-2 focus:ring-[#3A7AFE]/40 sm:w-[200px] dark:bg-white/10 dark:text-white">
                <SelectValue placeholder="Search provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.label} value={provider.label}>
                    {provider.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              ref={inputRef}
              className="h-12 w-full flex-1 rounded-[14px] border border-white/40 bg-white/70 text-base text-[#0F172A] placeholder:text-slate-400 shadow-sm transition focus:border-[#3A7AFE] focus:ring-2 focus:ring-[#3A7AFE]/30 dark:border-white/10 dark:bg-white/10 dark:text-white"
              placeholder={`Search ${engine.label}`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button
              type="submit"
              variant="ghost"
              className="group relative flex h-12 min-w-[3.25rem] items-center justify-center rounded-[14px] border border-white/50 bg-white/80 px-4 text-base text-slate-600 shadow-sm transition-all hover:min-w-[7.25rem] hover:border-[#0F172A] hover:bg-[#0F172A] hover:text-white dark:border-white/15 dark:bg-white/10 dark:text-white"
            >
              <span className="text-xl transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
                ↗
              </span>
              <span className="pointer-events-none absolute text-[10px] uppercase tracking-[0.35em] opacity-0 transition-all duration-300 group-hover:translate-x-2 group-hover:opacity-100">
                Open
              </span>
              <span className="sr-only">Open best match</span>
            </Button>
          </div>
          {normalizedQuery && filteredLinks.length === 0 && (
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start rounded-[12px] border border-white/40 bg-transparent text-left text-sm text-slate-600 backdrop-blur transition hover:border-[#3A7AFE] hover:text-[#3A7AFE] dark:border-white/10 dark:text-slate-200"
              onClick={handleWebSearch}
            >
              Search {engine.label} for “{query}”
            </Button>
          )}
        </form>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-slate-400 dark:text-slate-500">
            <p>{normalizedQuery ? `Matches (${filteredLinks.length})` : 'Pinned links'}</p>
            {!normalizedQuery && filteredLinks.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 transition hover:text-[#3A7AFE] dark:text-slate-300"
              >
                {showAll ? 'Show less' : 'More'}
                <span className={`text-base leading-none ${showAll ? 'rotate-180' : ''}`}>⌄</span>
              </button>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {visibleLinks.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="group flex min-h-[88px] flex-col justify-between rounded-[14px] border border-white/45 bg-white/65 px-3 py-3 text-sm shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur-lg transition hover:-translate-y-[3px] hover:border-[#3A7AFE]/70 hover:shadow-[0_24px_55px_rgba(15,23,42,0.2)] dark:border-white/10 dark:bg-white/10"
              >
                <p className="text-sm font-semibold text-[#0F172A] transition group-hover:text-[#3A7AFE] dark:text-[#F1F5F9]">
                  {link.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-300">{link.description}</p>
              </a>
            ))}
            {!filteredLinks.length && (
              <p className="rounded-[14px] border border-dashed border-slate-300/70 px-4 py-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                No pinned links found. Tap “More” to expand bookmarks or run a web search.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
