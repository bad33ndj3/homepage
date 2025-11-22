import { useCallback, useEffect, useMemo, useState } from 'react';

type Coordinates = {
  latitude: number;
  longitude: number;
};

type WeatherInfo = {
  temperature: number | null;
  feelsLike: number | null;
  code: number | null;
  isDay: boolean;
  nextRain?: string | null;
  windSpeed?: number | null;
  humidity?: number | null;
  sunrise?: string | null;
  sunset?: string | null;
  todayHigh?: number | null;
  todayLow?: number | null;
  rainSeries?: RainSample[];
  daily?: Array<{
    date: string;
    min: number;
    max: number;
    code: number;
    precipChance?: number | null;
  }>;
};

type RainSample = {
  time: string;
  probability: number;
  amount: number;
  value: number;
  label: string;
};

type RainGraphData = {
  areaPath: string;
  linePoints: string;
  ticks: Array<{ key: string; label: string }>;
};

type Status = 'idle' | 'loading' | 'ready' | 'error';

const weatherDescriptions: Record<number, { label: string; icon: string }> = {
  0: { label: 'Clear sky', icon: '☀️' },
  1: { label: 'Mainly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅️' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Foggy', icon: '🌫️' },
  48: { label: 'Freezing fog', icon: '🌫️' },
  51: { label: 'Light drizzle', icon: '🌦️' },
  53: { label: 'Drizzle', icon: '🌧️' },
  55: { label: 'Heavy drizzle', icon: '🌧️' },
  61: { label: 'Light rain', icon: '🌦️' },
  63: { label: 'Rain', icon: '🌧️' },
  65: { label: 'Heavy rain', icon: '🌧️' },
  71: { label: 'Snow', icon: '❄️' },
  80: { label: 'Rain showers', icon: '🌦️' },
  95: { label: 'Thunderstorm', icon: '⛈️' }
};

function getWeatherDescription(code: number | null | undefined) {
  if (!code && code !== 0) {
    return { label: '—', icon: '•' };
  }

  return (
    weatherDescriptions[code] ?? {
      label: 'Weather update',
      icon: '🌡️'
    }
  );
}

type WeatherBadgeProps = {
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  className?: string;
};

export function WeatherBadge({ expanded = false, onExpandedChange, className }: WeatherBadgeProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>('Your area');
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<boolean>(expanded);

  useEffect(() => {
    setShowDetails(expanded);
  }, [expanded]);

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported');
      setStatus('error');
      return;
    }

    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (geoError) => {
        setError(geoError.message);
        setStatus('error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (!coords) return;

    let cancelled = false;
    const fetchWeather = async () => {
      try {
        setStatus('loading');
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&hourly=precipitation_probability,precipitation&timezone=auto`;
        const reverseUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`;

        const [weatherResponse, reverseResponse] = await Promise.all([fetch(weatherUrl), fetch(reverseUrl)]);

        if (!weatherResponse.ok) {
          throw new Error('Weather request failed');
        }

        const weatherJson = await weatherResponse.json();
        const reverseJson = reverseResponse.ok ? await reverseResponse.json() : {};

        if (cancelled) return;

        setWeather({
          temperature: weatherJson?.current?.temperature_2m ?? null,
          feelsLike: weatherJson?.current?.apparent_temperature ?? null,
          code: weatherJson?.current?.weather_code ?? null,
          isDay: weatherJson?.current?.is_day === 1,
          nextRain: extractNextRain(weatherJson?.hourly) ?? null,
          windSpeed: weatherJson?.current?.wind_speed_10m ?? null,
          humidity: weatherJson?.current?.relative_humidity_2m ?? null,
          sunrise: weatherJson?.daily?.sunrise?.[0] ?? null,
          sunset: weatherJson?.daily?.sunset?.[0] ?? null,
          todayHigh: weatherJson?.daily?.temperature_2m_max?.[0] ?? null,
          todayLow: weatherJson?.daily?.temperature_2m_min?.[0] ?? null,
          rainSeries: buildRainSeries(weatherJson?.hourly),
          daily: buildDailySummary(weatherJson?.daily)
        });

        setLocationLabel(
          reverseJson?.city ||
            reverseJson?.locality ||
            reverseJson?.principalSubdivision ||
            reverseJson?.countryName ||
            'Your area'
        );
        setError(null);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch weather');
        setStatus('error');
      }
    };

    fetchWeather();

    return () => {
      cancelled = true;
    };
  }, [coords]);

  const details = useMemo(() => getWeatherDescription(weather?.code ?? undefined), [weather?.code]);
  const showContent = status === 'ready' && weather;

  const handleToggleDetails = () => {
    setShowDetails((prev) => {
      const next = !prev;
      onExpandedChange?.(next);
      return next;
    });
  };

  const statBlocks = showContent
    ? [
        { label: 'High / Low', value: formatHighLow(weather?.todayHigh, weather?.todayLow) },
        { label: 'Feels like', value: formatTemperature(weather?.feelsLike) },
        {
          label: 'Wind',
          value:
            typeof weather?.windSpeed === 'number' && !Number.isNaN(weather.windSpeed)
              ? `${Math.round(weather.windSpeed)} km/h`
              : '—'
        },
        {
          label: 'Humidity',
          value:
            typeof weather?.humidity === 'number' && !Number.isNaN(weather.humidity)
              ? `${Math.round(weather.humidity)}%`
              : '—'
        },
        { label: 'Sunrise', value: formatTime(weather?.sunrise) },
        { label: 'Sunset', value: formatTime(weather?.sunset) }
      ]
    : [];

  const compactStats = showContent
    ? [
        { label: 'Feels', value: formatTemperature(weather?.feelsLike) },
        { label: 'High / Low', value: formatHighLow(weather?.todayHigh, weather?.todayLow) },
        {
          label: 'Wind',
          value:
            typeof weather?.windSpeed === 'number' && !Number.isNaN(weather.windSpeed)
              ? `${Math.round(weather.windSpeed)} km/h`
              : null
        },
        {
          label: 'Humidity',
          value:
            typeof weather?.humidity === 'number' && !Number.isNaN(weather.humidity)
              ? `${Math.round(weather.humidity)}%`
              : null
        }
      ].filter((stat) => stat.value)
    : [];
  const quickStats = compactStats.slice(0, 2);

  const containerClasses = showDetails ? 'w-full px-4 py-4' : 'min-w-[240px] px-4 py-3';
  const sectionBase =
    'relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/85 text-slate-900 shadow-sm shadow-slate-200/70 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-white dark:shadow-black/20';

  const rainSeries = weather?.rainSeries ?? [];
  const rainBars = rainSeries.slice(0, 16);
  const rainGraph = useMemo(() => buildRainGraphData(rainBars), [rainBars]);
  const showRainGraph = Boolean(rainGraph);

  return (
    <section className={`${sectionBase} ${containerClasses}${className ? ` ${className}` : ''}`}>
      {showRainGraph && rainGraph && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-2 sm:px-5" aria-hidden>
          <svg viewBox="0 0 100 100" className="h-24 w-full">
            <polyline
              points={rainGraph.linePoints}
              fill="none"
              stroke="rgba(14,165,233,0.85)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="mt-1 flex justify-between text-[9px] font-medium text-slate-500/70 dark:text-white/60">
            {rainGraph.ticks.map((tick) => (
              <span key={tick.key}>{tick.label}</span>
            ))}
          </div>
        </div>
      )}
      <div className="relative z-30 flex flex-col gap-3">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-slate-500 dark:text-white/60">
          <span>Local weather</span>
          <button
            type="button"
            onClick={handleToggleDetails}
            aria-pressed={showDetails}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200/60 bg-white/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-600 transition hover:border-accent hover:bg-white dark:border-white/30 dark:bg-white/10 dark:text-white"
          >
            {showDetails ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {showContent ? (
          <>
            {showDetails ? (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-lg font-semibold leading-tight text-slate-900 dark:text-white">{locationLabel}</p>
                    <p className="text-sm text-slate-500 dark:text-white/80">
                      {weather?.nextRain ? (
                        <>
                          Rain around <span className="font-semibold text-slate-900 dark:text-white">{weather.nextRain}</span>
                        </>
                      ) : (
                        'Skies stay dry for now'
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-semibold leading-none text-slate-900 dark:text-white sm:text-5xl">
                      {formatTemperature(weather?.temperature)}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-white/80">
                      <span className="mr-1 text-xl" role="img" aria-hidden="true">
                        {details.icon}
                      </span>
                      {details.label}
                    </p>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-white/60">
                      {weather?.isDay ? 'Daytime' : 'Night'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                  {statBlocks.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-slate-100/80 bg-white/80 px-3 py-2 text-slate-900 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                    >
                      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 dark:text-white/60">{stat.label}</p>
                      <p className="text-base font-semibold text-slate-900 dark:text-white">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {weather?.daily && weather.daily.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-slate-400 dark:text-white/60">3-day outlook</p>
                    <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm">
                      {weather.daily.map((day) => {
                        const meta = getWeatherDescription(day.code);
                        return (
                          <div
                            key={day.date}
                            className="rounded-2xl border border-slate-100/80 bg-white/80 px-2 py-2 text-center text-slate-900 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                          >
                            <p className="text-[11px] text-slate-500 dark:text-white/70">{formatDay(day.date)}</p>
                            <div className="text-2xl" role="img" aria-label={meta.label}>
                              {meta.icon}
                            </div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white">
                              {Math.round(day.min)}° / {Math.round(day.max)}°
                            </p>
                            {typeof day.precipChance === 'number' && !Number.isNaN(day.precipChance) && (
                              <p className="text-[10px] text-sky-600 dark:text-sky-200">{day.precipChance}% rain</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-semibold leading-tight text-slate-900 dark:text-white">{locationLabel}</p>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-white/60">
                      {weather?.isDay ? 'Daytime' : 'Night'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-2xl" role="img" aria-hidden="true">
                      {details.icon}
                    </span>
                    <div className="text-right">
                      <p className="text-3xl font-semibold leading-none text-slate-900 dark:text-white">
                        {formatTemperature(weather?.temperature)}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-white/70">{details.label}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 text-[10px] text-slate-500 dark:text-white/80">
                  {quickStats.length === 0 ? (
                    <span className="text-slate-400 dark:text-white/60">Pulling forecast…</span>
                  ) : (
                    quickStats.map((stat) => (
                      <span
                        key={stat.label}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white px-2 py-1 text-slate-600 shadow-sm dark:border-white/15 dark:bg-white/10 dark:text-white"
                      >
                        <span>{stat.label}</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{stat.value}</span>
                      </span>
                    ))
                  )}
                </div>
              </div>
            )}

          </>
        ) : (
          <div className="min-h-[72px] text-sm text-slate-500 dark:text-white/80">
            {status === 'loading' && <p>Fetching local weather…</p>}
            {status === 'idle' && <p>Waiting for location permission…</p>}
            {status === 'error' && <p className="text-rose-500 dark:text-rose-200">{error ?? 'Unable to fetch weather right now.'}</p>}
          </div>
        )}
      </div>
    </section>
  );
}

function extractNextRain(hourly?: { time?: string[]; precipitation_probability?: number[]; precipitation?: number[] }) {
  if (!hourly?.time || !hourly.precipitation_probability) return null;
  for (let i = 0; i < hourly.time.length; i += 1) {
    const chance = hourly.precipitation_probability[i];
    const amount = hourly.precipitation?.[i] ?? 0;
    if (chance >= 40 || amount > 0) {
      const timestamp = new Date(hourly.time[i]);
      if (Number.isNaN(timestamp.getTime())) continue;
      return timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
  }
  return null;
}

function buildDailySummary(daily?: {
  time?: string[];
  temperature_2m_max?: number[];
  temperature_2m_min?: number[];
  weather_code?: number[];
  precipitation_probability_max?: number[];
}) {
  if (!daily?.time || !daily.temperature_2m_max || !daily.temperature_2m_min) return undefined;
  const nextDays = daily.time.slice(1, 4);
  return nextDays.map((date, index) => ({
    date,
    max: daily.temperature_2m_max?.[index + 1] ?? 0,
    min: daily.temperature_2m_min?.[index + 1] ?? 0,
    code: daily.weather_code?.[index + 1] ?? 0,
    precipChance: daily.precipitation_probability_max?.[index + 1] ?? null
  }));
}

function buildRainSeries(hourly?: {
  time?: string[];
  precipitation_probability?: number[];
  precipitation?: number[];
}) {
  if (!hourly?.time || !hourly.precipitation_probability) return undefined;
  const now = Date.now();
  const samples: RainSample[] = [];

  for (let i = 0; i < hourly.time.length && samples.length < 24; i += 1) {
    const timestamp = new Date(hourly.time[i]);
    if (Number.isNaN(timestamp.getTime())) continue;
    if (timestamp.getTime() < now) continue;
    const probability = hourly.precipitation_probability?.[i] ?? 0;
    const amount = hourly.precipitation?.[i] ?? 0;
    const normalizedFromChance = probability / 100;
    const normalizedFromAmount = Math.min(amount / 3, 1);
    const value = Math.min(1, Math.max(normalizedFromChance, normalizedFromAmount));
    samples.push({
      time: hourly.time[i],
      probability,
      amount,
      value,
      label: timestamp.toLocaleTimeString([], { hour: 'numeric' })
    });
  }

  return samples.length > 0 ? samples : undefined;
}

function buildRainGraphData(samples: RainSample[]): RainGraphData | null {
  if (!samples.length) return null;
  const maxValue = Math.max(...samples.map((sample) => sample.value));
  if (maxValue <= 0) return null;
  const effectiveMax = Math.max(maxValue, 0.3);
  const lastIndex = Math.max(samples.length - 1, 1);
  const coords = samples.map((sample, index) => {
    const x = (index / lastIndex) * 100;
    const y = 100 - (sample.value / effectiveMax) * 100;
    return { x, y };
  });
  const areaSegments = coords.map((point) => `L${point.x},${point.y}`).join(' ');
  const areaPath = `M0,100 ${areaSegments} L100,100 Z`;
  const linePoints = coords.map((point) => `${point.x},${point.y}`).join(' ');
  const tickSlots = Math.min(4, samples.length);
  const ticks = Array.from({ length: tickSlots }, (_, index) => {
    if (tickSlots === 1) {
      const sample = samples[0];
      return { key: `${sample.time}-0`, label: sample.label };
    }
    const relative = index / (tickSlots - 1);
    const sampleIndex = Math.min(samples.length - 1, Math.round(relative * (samples.length - 1)));
    const sample = samples[sampleIndex];
    return { key: `${sample.time}-${index}`, label: sample.label };
  });
  return { areaPath, linePoints, ticks };
}

function formatDay(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString([], { weekday: 'short' });
}

function formatTemperature(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `${Math.round(value)}°`;
}

function formatHighLow(high?: number | null, low?: number | null) {
  const formattedHigh = formatTemperature(high);
  const formattedLow = formatTemperature(low);
  if (formattedHigh === '—' && formattedLow === '—') return '—';
  return `${formattedHigh} / ${formattedLow}`;
}

function formatTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
