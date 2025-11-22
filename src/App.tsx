import { useEffect, useState } from 'react';
import { SearchBar } from './widgets/SearchBar';
import { StatusBoard } from './widgets/StatusBoard';
import { WeatherBadge } from './widgets/WeatherBadge';
import { SettingsModal } from './components/SettingsModal';
import { useLocalStorage } from './hooks/useLocalStorage';

function App() {
  const [greeting, setGreeting] = useState(() => getGreeting(new Date()));
  const [dateLabel, setDateLabel] = useState(() => formatDate(new Date()));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailedWeather, setDetailedWeather] = useLocalStorage('homebase-weather-details', false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => {
      const now = new Date();
      setGreeting(getGreeting(now));
      setDateLabel(formatDate(now));
    };

    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const heroHeader = (
    <header className="flex flex-1 flex-col gap-3 rounded-3xl border border-white/40 bg-white/70 px-4 py-3 shadow-sm shadow-slate-200/70 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-accent">{dateLabel}</p>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Hi Casper, {greeting}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-300">
          Quick widgets & live weather for your day.
        </p>
      </div>
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-lg text-slate-700 shadow-sm transition hover:border-accent hover:text-accent dark:border-white/20 dark:bg-white/10 dark:text-white"
          aria-label="Open settings"
          title="Open settings"
        >
          ⚙️
        </button>
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
              />
            </div>
          </div>
        )}

        <SearchBar />

        <StatusBoard />

        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)}>
          <section>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-100">Weather detail</p>
                <p className="text-xs text-slate-400">Show extended multi-day forecast in the header.</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailedWeather((prev) => !prev)}
                aria-pressed={detailedWeather}
                aria-label="Toggle detailed weather view"
                className={`inline-flex h-7 w-12 items-center rounded-full border border-white/20 px-1 transition ${
                  detailedWeather ? 'bg-accent text-slate-900' : 'bg-white/10 text-white'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow ${
                    detailedWeather ? 'translate-x-5' : 'translate-x-0'
                  } transition`}
                />
              </button>
            </div>
          </section>
        </SettingsModal>
      </div>
    </div>
  );
}

export default App;

function getGreeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return 'good morning';
  if (hour < 18) return 'good afternoon';
  return 'good evening';
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }).format(date);
}
