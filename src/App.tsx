import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SearchBar } from './widgets/SearchBar';
import { StatusBoard } from './widgets/StatusBoard';
import { WeatherBadge } from './widgets/WeatherBadge';
import { SettingsModal } from './components/SettingsModal';
import { useLocalStorage } from './hooks/useLocalStorage';

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

  const heroHeader = (
    <header className="flex flex-1 flex-col gap-3 rounded-3xl border border-white/40 bg-white/70 px-4 py-3 shadow-sm shadow-slate-200/70 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex flex-col gap-1 text-accent sm:flex-row sm:items-baseline sm:gap-3">
          <span className="text-xs uppercase tracking-[0.35em]">{dateLabel}</span>
          <span className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {timeLabel}
          </span>
        </div>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Hi Casper, {greeting}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-300">
          Quick widgets & live weather for your day.
        </p>
      </div>
      <div className="flex items-center justify-end">
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e2e8ff,_#f8fafc_45%)] px-4 py-6 text-slate-900 dark:bg-[radial-gradient(circle_at_top,_#050816,_#0f172a_55%)] dark:text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        {detailedWeather ? (
          <div className="flex flex-col gap-4">
            {heroHeader}
            <WeatherBadge
              expanded={detailedWeather}
              onExpandedChange={setDetailedWeather}
              className="w-full"
              timeZone={resolvedTimeZone}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
            {heroHeader}
            <div className="w-full lg:w-[360px] lg:self-stretch">
              <WeatherBadge
                expanded={detailedWeather}
                onExpandedChange={setDetailedWeather}
                className="h-full"
                timeZone={resolvedTimeZone}
              />
            </div>
          </div>
        )}

        <SearchBar />

        <StatusBoard />

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
