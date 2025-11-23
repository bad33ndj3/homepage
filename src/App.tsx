import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SearchBar } from './widgets/SearchBar';
import { StatusBoard } from './widgets/StatusBoard';
import { WeatherBadge, type WeatherSummary } from './widgets/WeatherBadge';
import { SettingsModal } from './components/SettingsModal';
import { useLocalStorage } from './hooks/useLocalStorage';
import linksConfig from './config/links.json';

const SYSTEM_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
const PRESET_TIME_ZONES = Array.from(
  new Set([
    SYSTEM_TIME_ZONE,
    'UTC',
    'Europe/Amsterdam',
    'Europe/London',
    'America/New_York',
    'America/Los_Angeles',
    'Asia/Tokyo',
    'Australia/Sydney'
  ])
);

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailedWeather, setDetailedWeather] = useLocalStorage('homebase-weather-details', false);
  const [weatherSummary, setWeatherSummary] = useState<WeatherSummary | null>(null);
  const [timeZoneSetting, setTimeZoneSetting] = useLocalStorage('homebase-timezone', SYSTEM_TIME_ZONE);
  const normalizedTimeZone = (timeZoneSetting ?? '').trim() || SYSTEM_TIME_ZONE;
  const resolvedTimeZone = useMemo(() => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: normalizedTimeZone }).format();
      return normalizedTimeZone;
    } catch {
      return SYSTEM_TIME_ZONE;
    }
  }, [normalizedTimeZone]);
  const [timeZoneValid, setTimeZoneValid] = useState(true);

  useEffect(() => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: normalizedTimeZone }).format();
      setTimeZoneValid(true);
    } catch {
      setTimeZoneValid(false);
    }
  }, [normalizedTimeZone]);

  const [greeting, setGreeting] = useState(() => getGreeting(new Date(), resolvedTimeZone));
  const [dateLabel, setDateLabel] = useState(() => formatDate(new Date(), resolvedTimeZone));
  const [timeLabel, setTimeLabel] = useState(() => formatTimeOfDay(new Date(), resolvedTimeZone));
  const weatherSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => {
      const now = new Date();
      setGreeting(getGreeting(now, resolvedTimeZone));
      setDateLabel(formatDate(now, resolvedTimeZone));
      setTimeLabel(formatTimeOfDay(now, resolvedTimeZone));
    };

    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, [resolvedTimeZone]);

  const handleWeatherPillClick = () => {
    setDetailedWeather(true);
    weatherSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const topBar = (
    <header className="flex flex-col gap-3 rounded-2xl border border-white/40 bg-white/80 px-4 py-3 shadow-sm shadow-slate-200/70 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-baseline gap-3 text-accent">
          <span className="text-[11px] uppercase tracking-[0.35em]">{dateLabel}</span>
          <span className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {timeLabel}
          </span>
        </div>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Hi Casper, {greeting}</p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleWeatherPillClick}
          className="flex min-w-[220px] items-center gap-3 rounded-full border border-white/50 bg-white/90 px-3 py-2 text-left shadow-sm transition hover:border-accent hover:text-accent dark:border-white/20 dark:bg-white/10"
        >
          <span className="text-xl" role="img" aria-hidden="true">
            {weatherSummary?.icon ?? '⛅️'}
          </span>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-white/60">
              Weather
            </p>
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {weatherSummary
                ? `${weatherSummary.location} · ${weatherSummary.temperature}`
                : 'Loading forecast…'}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-white/70">
              {weatherSummary?.description ?? 'Tap for details'}
            </p>
          </div>
        </button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
          title="Open settings"
          className="h-9 w-9 rounded-full border-slate-200 bg-white/80 text-lg text-slate-700 shadow-sm hover:border-accent hover:text-accent dark:border-white/20 dark:bg-white/10 dark:text-white"
        >
          ⚙️
        </Button>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e2e8ff,_#f8fafc_45%)] px-4 py-5 text-slate-900 dark:bg-[radial-gradient(circle_at_top,_#050816,_#0f172a_55%)] dark:text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        {topBar}

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <SearchBar />
            <StatusBoard />
          </div>
          <div className="space-y-4">
            <div ref={weatherSectionRef}>
              <WeatherBadge
                expanded={detailedWeather}
                onExpandedChange={setDetailedWeather}
                onSummaryChange={setWeatherSummary}
                className="h-full"
                timeZone={resolvedTimeZone}
              />
            </div>
            <PersonalNewsCard />
          </div>
        </div>

        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)}>
          <section className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Time zone</p>
                  <p className="text-xs text-slate-400">Control how the greeting and weather times are rendered.</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setTimeZoneSetting(SYSTEM_TIME_ZONE)}
                  className="text-xs text-white/70 hover:text-accent"
                >
                  Use system
                </Button>
              </div>
              <Input
                value={timeZoneSetting}
                onChange={(event) => setTimeZoneSetting(event.target.value)}
                placeholder="e.g. Europe/Amsterdam"
                className="border-white/20 bg-white/5 text-white placeholder:text-white/30"
              />
              {!timeZoneValid && (
                <p className="text-xs text-rose-300">
                  Invalid time zone identifier. Falling back to <span className="font-semibold">{SYSTEM_TIME_ZONE}</span>.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {PRESET_TIME_ZONES.map((timeZone) => (
                  <Button
                    key={timeZone}
                    type="button"
                    size="sm"
                    variant={resolvedTimeZone === timeZone ? 'default' : 'outline'}
                    onClick={() => setTimeZoneSetting(timeZone)}
                    className="text-xs"
                  >
                    {timeZone}
                  </Button>
                ))}
              </div>
            </div>
          </section>
          <section className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-100">Weather detail</p>
                <p className="text-xs text-slate-400">Show extended multi-day forecast in the header.</p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="weather-detail" className="text-xs uppercase tracking-[0.3em] text-white/60">
                  Detail
                </Label>
                <Switch
                  id="weather-detail"
                  checked={detailedWeather}
                  onCheckedChange={(checked) => setDetailedWeather(checked)}
                />
              </div>
            </div>
          </section>
        </SettingsModal>
      </div>
    </div>
  );
}

export default App;

type LinkConfig = {
  label: string;
  description: string;
  url: string;
};

const quickLinkGroups: Record<'personal' | 'news', string[]> = {
  personal: ['YNAB', 'ChatGPT', 'Gmail', 'Outlook', 'Home Assistant'],
  news: ['Tweakers', 'NU.nl', 'GitLab']
};

function PersonalNewsCard() {
  const [tab, setTab] = useState<'personal' | 'news'>('personal');
  const favorites: LinkConfig[] = linksConfig as LinkConfig[];
  const activeLinks = favorites.filter((link) => quickLinkGroups[tab].includes(link.label));

  return (
    <Card className="border border-white/40 bg-white/85 shadow-sm shadow-slate-200/70 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-black/20">
      <CardHeader className="flex flex-col gap-3 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Personal / News</CardTitle>
            <CardDescription className="text-xs">Jump to daily essentials or headlines.</CardDescription>
          </div>
          <div className="flex rounded-full border border-white/40 bg-white/70 p-1 text-xs dark:border-white/15 dark:bg-white/10">
            {(['personal', 'news'] as const).map((key) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={tab === key ? 'default' : 'ghost'}
                onClick={() => setTab(key)}
                className={`h-8 rounded-full px-3 text-[11px] capitalize ${
                  tab === key ? 'bg-accent text-white shadow-sm' : 'text-slate-600 dark:text-white/70'
                }`}
              >
                {key}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        {activeLinks.map((link) => (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="group rounded-2xl border border-white/50 bg-white/90 px-3 py-3 text-sm shadow-sm transition hover:border-accent hover:text-accent dark:border-white/10 dark:bg-white/10"
          >
            <p className="font-semibold text-slate-900 transition group-hover:text-accent dark:text-white">
              {link.label}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-300">{link.description}</p>
          </a>
        ))}
        {!activeLinks.length && (
          <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-xs text-slate-500 dark:border-white/10 dark:text-slate-300">
            Add more {tab === 'personal' ? 'personal' : 'news'} bookmarks in config/links.json.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function getGreeting(date: Date, timeZone: string) {
  let hour = date.getHours();
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone
    });
    hour = Number(formatter.format(date));
  } catch {
    hour = date.getHours();
  }
  if (hour < 12) return 'good morning';
  if (hour < 18) return 'good afternoon';
  return 'good evening';
}

function formatDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone
  }).format(date);
}

function formatTimeOfDay(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone
  }).format(date);
}
