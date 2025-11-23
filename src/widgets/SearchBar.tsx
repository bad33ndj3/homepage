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
    <Card className="border border-white/40 bg-white/80 shadow-sm shadow-slate-200/70 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-black/30">
      <CardHeader className="space-y-1">
        <CardTitle>Search & Links</CardTitle>
        <CardDescription>Filter quick links first, then jump to the web.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
        >
          <Select
            value={engine.label}
            onValueChange={(value) => {
              const selected = providers.find((provider) => provider.label === value);
              if (selected) setEngine(selected);
            }}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
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
            className="w-full flex-1"
            placeholder={`Search ${engine.label}`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button type="submit" className="w-full sm:w-auto">
            Open match
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handleWebSearch}
          >
            Web search
          </Button>
        </form>
        <div className="space-y-2">
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAll((prev) => !prev)}
              className="gap-1 text-xs text-slate-500 hover:text-accent dark:text-slate-300"
            >
              {showAll ? 'Show less' : 'Show more'}
              <span className={`text-base leading-none ${showAll ? 'rotate-180' : ''}`}>⌄</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
