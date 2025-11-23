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
import linksConfig from '../config/links.json';

const providers = [
  { label: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  { label: 'Google', url: 'https://www.google.com/search?q=' },
  { label: 'Perplexity', url: 'https://www.perplexity.ai/search?q=' }
];

type LinkConfig = {
  label: string;
  description: string;
  url: string;
  category?: string;
};

const favoriteLinks: LinkConfig[] = linksConfig as LinkConfig[];

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
    <Card className="rounded-[14px] border border-[#E2E8F0] bg-white/70 shadow-[0_12px_35px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-[#4B5563] dark:bg-[#1E293B]/65 dark:shadow-[0_16px_40px_rgba(0,0,0,0.32)]">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-lg text-[#0F172A] dark:text-[#F1F5F9]">Search & Links</CardTitle>
        <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
          Type to filter bookmarks; if nothing matches, jump to your search engine.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
        >
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Select
              value={engine.label}
              onValueChange={(value) => {
                const selected = providers.find((provider) => provider.label === value);
                if (selected) setEngine(selected);
              }}
            >
              <SelectTrigger className="w-full rounded-[10px] border-[#E2E8F0] sm:w-[180px] dark:border-[#334155]">
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
              className="w-full flex-1 rounded-[10px] border-[#E2E8F0] bg-white/70 backdrop-blur-sm placeholder:text-slate-400 transition focus:border-[#3A7AFE] focus:ring-2 focus:ring-[#3A7AFE]/30 dark:border-[#334155] dark:bg-[#1E293B]/80"
              placeholder={`Search ${engine.label}`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button
              type="submit"
              className="w-full rounded-[10px] bg-[#3A7AFE] text-white shadow-sm hover:bg-[#3166d4] sm:w-[140px]"
            >
              Open match
            </Button>
          </div>
          {normalizedQuery && filteredLinks.length === 0 && (
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start rounded-[10px] border-[#E2E8F0] text-left text-sm text-slate-600 transition hover:border-[#3A7AFE] hover:text-[#3A7AFE] dark:border-[#334155] dark:text-slate-200"
              onClick={handleWebSearch}
            >
              Search {engine.label} for “{query}”
            </Button>
          )}
        </form>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <p>{normalizedQuery ? `Matches (${filteredLinks.length})` : 'Pinned links'}</p>
            {!normalizedQuery && filteredLinks.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 transition hover:text-accent dark:text-slate-300"
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
                className="group rounded-[14px] border border-[#E2E8F0] bg-white/70 px-3 py-2.5 text-sm shadow-[0_10px_25px_rgba(15,23,42,0.08)] backdrop-blur-lg transition hover:-translate-y-[2px] hover:border-[#3A7AFE] hover:text-[#3A7AFE] dark:border-[#4B5563] dark:bg-[#1E293B]/65 dark:shadow-[0_14px_30px_rgba(0,0,0,0.26)]"
              >
                <p className="text-sm font-semibold text-[#0F172A] transition group-hover:text-[#3A7AFE] dark:text-[#F1F5F9]">
                  {link.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-300">{link.description}</p>
              </a>
            ))}
            {!filteredLinks.length && (
              <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                No pinned links found. Press “Web search” to look online.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
