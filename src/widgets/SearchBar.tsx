import { FormEvent, useEffect, useRef, useState } from 'react';
import { Card } from '../components/Card';

const providers = [
  { label: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  { label: 'Google', url: 'https://www.google.com/search?q=' },
  { label: 'Perplexity', url: 'https://www.perplexity.ai/search?q=' }
];

export function SearchBar() {
  const [engine, setEngine] = useState(providers[0]);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) return;
    const url = `${engine.url}${encodeURIComponent(query)}`;
    window.open(url, '_blank');
  };

  return (
    <Card title="Search" subtitle="DuckDuckGo-first search box with quick engine swap">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row">
        <select
          className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white md:w-40"
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
          className="flex-1 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-base text-white outline-none focus:border-accent"
          placeholder={`Search ${engine.label}`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button
          type="submit"
          className="rounded-xl bg-accent px-6 py-3 text-base font-medium text-slate-900 transition hover:brightness-110"
        >
          Search
        </button>
      </form>
    </Card>
  );
}
