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
import { CommandPalette, type CommandItem } from './components/CommandPalette';
import { SearchBarInner as SearchBar } from './widgets/SearchBar';
import { StatusBoard, buildGitLabFilterUrl, type StatusHighlight } from './widgets/StatusBoard';
import { WeatherBadge, type WeatherSummary } from './widgets/WeatherBadge';
import { SettingsModal } from './components/SettingsModal';
import { useLocalStorage } from './hooks/useLocalStorage';
import linksConfig, { type LinkConfig } from './config/links';
import personalizationConfig, { type WeatherLocationConfig } from './config/personalization';

const SYSTEM_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
const DEFAULT_DISPLAY_NAME =
  typeof personalizationConfig?.displayName === 'string' && personalizationConfig.displayName.trim()
    ? personalizationConfig.displayName.trim()
    : 'Casper';
const CONFIGURED_WEATHER_LOCATION: WeatherLocationConfig | null =
  personalizationConfig.weatherLocation &&
  typeof personalizationConfig.weatherLocation.latitude === 'number' &&
  typeof personalizationConfig.weatherLocation.longitude === 'number'
    ? {
        latitude: personalizationConfig.weatherLocation.latitude,
        longitude: personalizationConfig.weatherLocation.longitude,
        label: personalizationConfig.weatherLocation.label
      }
    : null;
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
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [gitlabHighlights, setGitlabHighlights] = useState<StatusHighlight[]>([]);
  const [displayName, setDisplayName] = useLocalStorage<string | null>('homebase-display-name', DEFAULT_DISPLAY_NAME);
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
  const [clock, setClock] = useState(() => new Date());
  const [secondsTick, setSecondsTick] = useState(0);
  const [minuteTick, setMinuteTick] = useState(0);
  const weatherSectionRef = useRef<HTMLDivElement>(null);
  const favorites: LinkConfig[] = linksConfig.map((link) => ({
    ...link,
    category: link.category ?? defaultCategoryByLabel[link.label] ?? 'General'
  }));

  const minuteKeyRef = useRef<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => {
      const now = new Date();
      setClock(now);
      setGreeting(getGreeting(now, resolvedTimeZone));
      setDateLabel(formatDate(now, resolvedTimeZone));
      const minuteKey = formatMinuteKey(now, resolvedTimeZone);
      if (minuteKeyRef.current && minuteKeyRef.current !== minuteKey) {
        setMinuteTick((tick) => tick + 1);
      }
      minuteKeyRef.current = minuteKey;
      setSecondsTick((tick) => tick + 1);
    };

    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [resolvedTimeZone]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      const isMetaK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      const isSlash = event.key === '/' && !event.metaKey && !event.ctrlKey;

      if (isMetaK) {
        event.preventDefault();
        setPaletteOpen(true);
        setPaletteQuery('');
      }

      if (!isTypingTarget && isSlash) {
        event.preventDefault();
        setPaletteOpen(true);
        setPaletteQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const timeParts = useMemo(() => getTimeParts(clock, resolvedTimeZone), [clock, resolvedTimeZone]);
  const secondsValue = Number(timeParts.secondsValue ?? 0);
  const secondsPulse = secondsTick % 2 === 0;
  const minuteShift = minuteTick % 2 === 0;
  const weatherLocationLabel =
    weatherSummary?.location ?? CONFIGURED_WEATHER_LOCATION?.label ?? 'Your area';
  const weatherTemperatureLabel = weatherSummary?.temperature ?? '—°';
  const weatherSecondaryLine = weatherSummary?.description ?? 'Forecast loading…';
  const weatherTertiaryLine = weatherSummary?.description
    ? 'Tap to expand detailed view'
    : 'Tap to allow location or configure coordinates';
  const weatherIcon = weatherSummary?.icon ?? '⛅️';
  const greetingName = displayName?.trim() || DEFAULT_DISPLAY_NAME;

  const handleWeatherPillClick = () => {
    setDetailedWeather(true);
    weatherSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const topBar = (
    <header className="rounded-[14px] border border-[#E2E8F0] bg-white/70 px-5 py-5 shadow-[0_20px_45px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-colors dark:border-[#4B5563] dark:bg-[#1E293B]/60 dark:shadow-[0_26px_50px_rgba(0,0,0,0.4)]">
      <div className="grid gap-6 text-center sm:grid-cols-3 sm:text-left">
        <div className="flex flex-col items-center text-left sm:items-start">
          <p className="text-lg font-medium text-[#0F172A] dark:text-[#F1F5F9]">
            Hi {greetingName}
            <span className="ml-2 text-sm text-slate-500 dark:text-slate-300">{greeting}</span>
          </p>
          <p className="text-sm uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
            {dateLabel}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center text-center sm:items-center">
          <div className="relative flex items-baseline justify-center gap-3 font-mono text-[clamp(3rem,10vw,6rem)] leading-none tracking-tight text-[#0F172A] dark:text-[#F1F5F9]">
            <span
              className={`transition-transform duration-150 ease-linear ${
                minuteShift ? 'translate-y-0' : '-translate-y-1'
              }`}
            >
              {timeParts.hoursMinutes}
            </span>
            <span
              className={`text-[clamp(1.5rem,4vw,2.5rem)] text-slate-500 transition-all duration-150 ease-linear ${
                secondsPulse ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-60'
              }`}
            >
              {timeParts.seconds}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleWeatherPillClick}
          className="flex flex-col items-center gap-2 rounded-[16px] border border-white/40 bg-white/70 px-4 py-3 text-right shadow-[0_14px_30px_rgba(15,23,42,0.08)] backdrop-blur-lg transition hover:-translate-y-[1px] hover:border-[#3A7AFE] hover:text-[#3A7AFE] dark:border-white/20 dark:bg-white/10 dark:text-[#F1F5F9] dark:shadow-[0_18px_36px_rgba(0,0,0,0.35)] sm:items-end"
        >
          <div className="flex items-center gap-2 text-[#0F172A] dark:text-[#F1F5F9]">
            <span className="text-xl" role="img" aria-hidden="true">
              {weatherIcon}
            </span>
            <p className="text-sm font-semibold">
              {weatherLocationLabel} · {weatherTemperatureLabel}
            </p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-300">{weatherSecondaryLine}</p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            {weatherTertiaryLine}
          </p>
        </button>
      </div>
    </header>
  );

  const commandItems: CommandItem[] = useMemo(() => {
    const linkItems: CommandItem[] = favorites.map((link) => ({
      id: `link-${link.label}`,
      label: link.label,
      description: link.description,
      href: link.url,
      keywords: ['bookmark', 'link']
    }));

    const gitlabCommands: CommandItem[] = [
      {
        id: 'gitlab-assigned',
        label: 'GitLab: Assigned merge requests',
        description: 'Open your assigned MRs dashboard',
        href: buildGitLabFilterUrl({})
      },
      {
        id: 'gitlab-conflicts',
        label: 'GitLab: Conflicts',
        description: 'MRs with conflicts',
        href: buildGitLabFilterUrl({ with_merge_status_recheck: 'true' }),
        badge: 'conflicts'
      },
      {
        id: 'gitlab-stale',
        label: 'GitLab: Stale >48h',
        description: 'Older assigned MRs',
        href: buildGitLabFilterUrl({ updated_before: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() })
      },
      ...gitlabHighlights.map((highlight) => ({
        id: `mr-${highlight.url ?? highlight.title}`,
        label: highlight.title,
        description: highlight.meta,
        href: highlight.url,
        keywords: ['mr', 'merge', 'request', ...(highlight.tags ?? [])],
        badge: highlight.badge
      }))
    ];

    const weatherCommands: CommandItem[] = [
      {
        id: 'weather-toggle-on',
        label: 'Show detailed weather',
        description: 'Expand the multi-day view',
        action: () => {
          setDetailedWeather(true);
          weatherSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      },
      {
        id: 'weather-toggle-off',
        label: 'Hide detailed weather',
        action: () => setDetailedWeather(false)
      }
    ];

    return [...linkItems, ...gitlabCommands, ...weatherCommands];
  }, [favorites, gitlabHighlights, setDetailedWeather, weatherSectionRef]);

  const webSearchFallbackLabel = paletteQuery.trim()
    ? `Search web for “${paletteQuery.trim()}”`
    : null;
  const webSearchFallback = paletteQuery.trim()
    ? () => window.open(`https://duckduckgo.com/?q=${encodeURIComponent(paletteQuery.trim())}`, '_blank')
    : null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#eef2f8,_#f7f9fc_55%)] px-4 py-5 text-[#0F172A] dark:bg-[radial-gradient(circle_at_top,_#0b1221,_#0f172a_55%)] dark:text-[#F1F5F9]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        {topBar}

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <SearchBar autoFocus={false} />
            <StatusBoard onHighlightsChange={setGitlabHighlights} />
          </div>
          <div className="space-y-4">
            <div ref={weatherSectionRef}>
              <WeatherBadge
                expanded={detailedWeather}
                onExpandedChange={setDetailedWeather}
                onSummaryChange={setWeatherSummary}
                className="h-full"
                timeZone={resolvedTimeZone}
                staticLocation={CONFIGURED_WEATHER_LOCATION}
              />
            </div>
            <BookmarksCard links={favorites} />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSettingsOpen(true)}
                className="rounded-full border-[#E2E8F0] bg-white/80 px-4 py-2 text-sm text-[#0F172A] shadow-[0_10px_25px_rgba(15,23,42,0.08)] backdrop-blur-lg transition hover:-translate-y-[1px] hover:border-[#3A7AFE] hover:text-[#3A7AFE] dark:border-[#4B5563] dark:bg-[#1E293B]/60 dark:text-[#F1F5F9]"
              >
                Settings
              </Button>
            </div>
          </div>
        </div>

        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)}>
          <section className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Display name</p>
                  <p className="text-xs text-slate-400">Personalize the greeting in the header.</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDisplayName(DEFAULT_DISPLAY_NAME)}
                  className="text-xs text-white/70 hover:text-accent"
                >
                  Reset
                </Button>
              </div>
              <Input
                value={displayName ?? ''}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="e.g. Casper"
                className="border-white/20 bg-white/5 text-white placeholder:text-white/30"
              />
            </div>
          </section>
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

        <CommandPalette
          open={paletteOpen}
          query={paletteQuery}
          onQueryChange={setPaletteQuery}
          onClose={() => setPaletteOpen(false)}
          commands={commandItems}
          fallbackLabel={webSearchFallbackLabel}
          fallbackAction={webSearchFallback}
        />
      </div>
    </div>
  );
}

export default App;

const defaultCategoryByLabel: Record<string, string> = {
  YNAB: 'Personal',
  ChatGPT: 'Personal',
  Gmail: 'Personal',
  Outlook: 'Personal',
  'Home Assistant': 'Personal',
  Tweakers: 'News',
  'NU.nl': 'News',
  GitLab: 'Work',
  Jira: 'Work'
};

function BookmarksCard({ links }: { links: LinkConfig[] }) {
  const categories = Array.from(
    new Set(links.map((link) => link.category ?? 'General'))
  );
  const [tab, setTab] = useState<string>(categories[0] ?? 'General');
  const activeLinks = links.filter((link) => (link.category ?? 'General') === tab);

  return (
    <Card className="border border-[#E2E8F0] bg-white/70 shadow-[0_12px_35px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-[#4B5563] dark:bg-[#1E293B]/65 dark:shadow-[0_16px_40px_rgba(0,0,0,0.32)] rounded-[14px]">
      <CardHeader className="flex flex-col gap-3 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base text-[#0F172A] dark:text-[#F1F5F9]">Bookmarks</CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Tabs follow your link categories.</CardDescription>
          </div>
          <div className="flex rounded-full border border-[#E2E8F0] bg-white/80 p-1 text-xs dark:border-[#4B5563] dark:bg-[#1E293B]/65">
            {categories.map((key) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={tab === key ? 'default' : 'ghost'}
                onClick={() => setTab(key)}
                className={`h-8 rounded-[10px] px-3 text-[11px] capitalize transition ${
                  tab === key ? 'bg-[#3A7AFE] text-white shadow-sm' : 'text-slate-600 hover:text-[#3A7AFE] dark:text-white/70'
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
            className="group rounded-[14px] border border-[#E2E8F0] bg-white/70 px-3 py-3 text-sm shadow-[0_10px_25px_rgba(15,23,42,0.08)] backdrop-blur-lg transition hover:-translate-y-[2px] hover:border-[#3A7AFE] hover:text-[#3A7AFE] dark:border-[#4B5563] dark:bg-[#1E293B]/65 dark:shadow-[0_14px_30px_rgba(0,0,0,0.26)]"
          >
            <p className="font-semibold text-[#0F172A] transition group-hover:text-[#3A7AFE] dark:text-[#F1F5F9]">
              {link.label}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-300">{link.description}</p>
          </a>
        ))}
        {!activeLinks.length && (
          <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-xs text-slate-500 dark:border-white/10 dark:text-slate-300">
            Add more {tab.toLowerCase()} bookmarks in config/links.local.json (set "category").
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

function formatMinuteKey(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone
  });
  return formatter.format(date);
}

function getTimeParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone
  });
  const parts = formatter.formatToParts(date);
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  const seconds = parts.find((part) => part.type === 'second')?.value ?? '00';
  return {
    hoursMinutes: `${hour}:${minute}`,
    seconds,
    secondsValue: Number(seconds)
  };
}
