import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
  nextRainMinutes?: number | null;
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
  label: string;
};

type RainGraphData = {
  probabilityLine: string;
  bars: Array<{ key: string; x: number; width: number; height: number; y: number }>;
  ticks: Array<{ key: string; label: string }>;
  maxAmount: number;
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

type StaticWeatherLocation = {
  latitude: number;
  longitude: number;
  label?: string | null;
};

type WeatherBadgeProps = {
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onSummaryChange?: (summary: WeatherSummary | null) => void;
  className?: string;
  timeZone: string;
  staticLocation?: StaticWeatherLocation | null;
};

export type WeatherSummary = {
  location: string;
  temperature: string;
  description: string;
  icon: string;
};

export function WeatherBadge({
  expanded = false,
  onExpandedChange,
  onSummaryChange,
  className,
  timeZone,
  staticLocation
}: WeatherBadgeProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>('Your area');
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<boolean>(expanded);

  useEffect(() => {
    setShowDetails(expanded);
  }, [expanded]);

  useEffect(() => {
    if (staticLocation) {
      setCoords({
        latitude: staticLocation.latitude,
        longitude: staticLocation.longitude
      });
      if (staticLocation.label) {
        setLocationLabel(staticLocation.label);
      }
    }
  }, [staticLocation]);

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
    if (staticLocation) return;
    requestLocation();
  }, [requestLocation, staticLocation]);

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

        const rainSeries = buildRainSeries(weatherJson?.hourly, timeZone);
        setWeather({
          temperature: weatherJson?.current?.temperature_2m ?? null,
          feelsLike: weatherJson?.current?.apparent_temperature ?? null,
          code: weatherJson?.current?.weather_code ?? null,
          isDay: weatherJson?.current?.is_day === 1,
          nextRain: extractNextRain(weatherJson?.hourly, timeZone) ?? null,
          windSpeed: weatherJson?.current?.wind_speed_10m ?? null,
          humidity: weatherJson?.current?.relative_humidity_2m ?? null,
          sunrise: weatherJson?.daily?.sunrise?.[0] ?? null,
          sunset: weatherJson?.daily?.sunset?.[0] ?? null,
          todayHigh: weatherJson?.daily?.temperature_2m_max?.[0] ?? null,
          todayLow: weatherJson?.daily?.temperature_2m_min?.[0] ?? null,
          rainSeries,
          nextRainMinutes: computeNextRainMinutes(rainSeries),
          daily: buildDailySummary(weatherJson?.daily)
        });

        const configuredLabel = staticLocation?.label?.trim();
        setLocationLabel(
          configuredLabel ||
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
  }, [coords, timeZone, staticLocation]);

  const details = useMemo(() => getWeatherDescription(weather?.code ?? undefined), [weather?.code]);
  const showContent = status === 'ready' && weather;

  useEffect(() => {
    if (!onSummaryChange) return;

    if (showContent && weather) {
      onSummaryChange({
        location: locationLabel,
        temperature: formatTemperature(weather.temperature),
        description: weather.nextRain ? `Rain around ${weather.nextRain}` : details.label,
        icon: details.icon
      });
      return;
    }

    onSummaryChange(null);
  }, [details.icon, details.label, locationLabel, onSummaryChange, showContent, weather]);

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
        { label: 'Sunrise', value: formatTime(weather?.sunrise, timeZone) },
        { label: 'Sunset', value: formatTime(weather?.sunset, timeZone) }
      ]
    : [];

  const quickStats = showContent
    ? [
        { label: 'Feels like', value: formatTemperature(weather?.feelsLike) },
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

  const rainSeries = weather?.rainSeries ?? [];
  const rainGraph = useMemo(() => buildRainGraphData(rainSeries), [rainSeries]);
  const locationSubtitle = showContent
    ? weather?.nextRain
      ? `Rain around ${weather.nextRain}`
      : 'Skies stay dry for now'
    : 'Waiting for forecast…';
  const keyEventLine = showContent
    ? weather?.nextRain
      ? `Rain around ${weather.nextRain} · Feels like ${formatTemperature(weather?.feelsLike)}`
      : `Feels like ${formatTemperature(weather?.feelsLike)}`
    : 'Awaiting forecast…';
  const windHumidityLine = showContent
    ? [
        typeof weather?.windSpeed === 'number' && !Number.isNaN(weather.windSpeed)
          ? `Wind ${Math.round(weather.windSpeed)} km/h`
          : null,
        typeof weather?.humidity === 'number' && !Number.isNaN(weather.humidity)
          ? `Humidity ${Math.round(weather.humidity)}%`
          : null
      ]
        .filter(Boolean)
        .join(' · ') || null
    : null;
  const rainAlertMinutes =
    showContent && typeof weather?.nextRainMinutes === 'number' ? weather.nextRainMinutes : null;

  return (
    <Card
      className={cn(
        'rounded-[14px] border border-[#E2E8F0] bg-white/90 text-[#0F172A] shadow-sm shadow-slate-200/70 backdrop-blur-md transition-colors dark:border-[#4B5563] dark:bg-[#1E293B]/65 dark:text-[#F1F5F9] dark:shadow-[0_16px_40px_rgba(0,0,0,0.32)]',
        className
      )}
    >
      <CardHeader className="space-y-2 px-5 pt-5 pb-3 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500 dark:text-white/60">Today</p>
            <CardTitle className="text-xl font-semibold text-[#0F172A] dark:text-[#F1F5F9]">{locationLabel}</CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-white/70">{locationSubtitle}</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold leading-none text-[#0F172A] dark:text-[#F1F5F9] sm:text-4xl">
              {showContent ? formatTemperature(weather?.temperature) : '—'}
            </p>
            <p className="text-sm text-slate-500 dark:text-white/80">
              <span className="mr-1 text-2xl" role="img" aria-hidden="true">
                {details.icon}
              </span>
              {details.label}
            </p>
            {showContent && (
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400 dark:text-white/60">
                {weather?.isDay ? 'Daytime' : 'Night'}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 px-5 pb-5 sm:px-6">
        {showContent ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1 text-sm text-slate-600 dark:text-white/80">
                <p>{keyEventLine}</p>
                {windHumidityLine && <p className="text-xs text-slate-500 dark:text-white/70">{windHumidityLine}</p>}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleToggleDetails}
                aria-pressed={showDetails}
                className="h-8 rounded-full border-[#E2E8F0] bg-white/80 px-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-600 transition hover:-translate-y-[1px] hover:border-[#3A7AFE] hover:text-[#3A7AFE] dark:border-[#4B5563] dark:bg-[#1E293B]/65 dark:text-white"
              >
                Details {showDetails ? '▴' : '▾'}
              </Button>
            </div>

            {typeof rainAlertMinutes === 'number' && rainAlertMinutes <= 60 && (
              <div className="flex items-center gap-2 rounded-[12px] border border-sky-200/70 bg-sky-50/80 px-3 py-2 text-xs font-semibold text-sky-800 shadow-[0_8px_20px_rgba(59,130,246,0.15)] dark:border-sky-400/30 dark:bg-sky-900/30 dark:text-sky-100">
                <span className="text-base" role="img" aria-hidden="true">
                  🌧️
                </span>
                <div className="flex-1">
                  <p className="text-xs">Rain expected in {Math.max(1, Math.round(rainAlertMinutes))} min</p>
                  <p className="text-[11px] font-normal text-sky-700 dark:text-sky-200">Take umbrella.</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-white/70">
              {quickStats.length === 0 ? (
                <span className="text-slate-400 dark:text-white/60">Pulling forecast…</span>
              ) : (
                quickStats.map((stat) => (
                  <span
                    key={stat.label}
                    className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white/90 px-3 py-1 text-slate-600 shadow-sm dark:border-[#4B5563] dark:bg-[#1E293B]/65 dark:text-white"
                  >
                    <span>{stat.label}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{stat.value}</span>
                  </span>
                ))
              )}
            </div>

            {showDetails && (
              <div className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {statBlocks.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-[12px] border border-[#E2E8F0] bg-white px-3 py-3 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]"
                    >
                      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 dark:text-white/60">{stat.label}</p>
                      <p className="text-lg font-semibold text-[#0F172A] dark:text-[#F1F5F9]">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {weather?.daily && weather.daily.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 dark:text-white/60">3-day outlook</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {weather.daily.map((day) => {
                        const meta = getWeatherDescription(day.code);
                        return (
                          <div
                            key={day.date}
                            className="rounded-[12px] border border-[#E2E8F0] bg-white px-3 py-3 text-center shadow-sm dark:border-[#334155] dark:bg-[#1E293B]"
                          >
                            <p className="text-xs text-slate-500 dark:text-white/70">{formatDay(day.date, timeZone)}</p>
                            <div className="text-2xl" role="img" aria-label={meta.label}>
                              {meta.icon}
                            </div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
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

                {rainGraph && (
                  <div className="space-y-2 rounded-[12px] border border-[#E2E8F0] bg-white p-4 shadow-sm dark:border-[#4B5563] dark:bg-[#1E293B]/65">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.35em] text-slate-400 dark:text-white/60">
                      <span>Next 24h precipitation</span>
                      <span className="text-[10px] normal-case tracking-normal text-slate-500 dark:text-white/70">
                        {rainGraph.maxAmount > 0 ? `${rainGraph.maxAmount.toFixed(1)} mm peak` : 'No rain expected'}
                      </span>
                    </div>
                    <svg viewBox="0 0 100 100" className="h-32 w-full" preserveAspectRatio="none">
                      {rainGraph.bars.map((bar) => (
                        <rect
                          key={bar.key}
                          x={bar.x}
                          y={bar.height === 0 ? 100 : bar.y}
                          width={bar.width}
                          height={Math.max(bar.height, 0.5)}
                          rx={1.5}
                          fill="rgba(59,130,246,0.25)"
                        />
                      ))}
                      <polyline
                        points={rainGraph.probabilityLine}
                        fill="none"
                        stroke="rgba(14,165,233,0.9)"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex justify-between text-[9px] font-medium text-slate-500 dark:text-white/60">
                      {rainGraph.ticks.map((tick) => (
                        <span key={tick.key}>{tick.label}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-white/70">
                      <span>Probability %</span>
                      <span>Rain (mm)</span>
                    </div>
                  </div>
                )}
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
      </CardContent>
    </Card>
  );
}

function extractNextRain(
  hourly: { time?: string[]; precipitation_probability?: number[]; precipitation?: number[] } | undefined,
  timeZone: string
) {
  if (!hourly?.time || !hourly.precipitation_probability) return null;
  for (let i = 0; i < hourly.time.length; i += 1) {
    const chance = hourly.precipitation_probability[i];
    const amount = hourly.precipitation?.[i] ?? 0;
    if (chance >= 40 || amount > 0) {
      const timestamp = new Date(hourly.time[i]);
      if (Number.isNaN(timestamp.getTime())) continue;
      return timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone });
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

function buildRainSeries(
  hourly: { time?: string[]; precipitation_probability?: number[]; precipitation?: number[] } | undefined,
  timeZone: string
) {
  if (!hourly?.time || !hourly.precipitation_probability) return undefined;
  const now = Date.now();
  const samples: RainSample[] = [];

  for (let i = 0; i < hourly.time.length && samples.length < 24; i += 1) {
    const timestamp = new Date(hourly.time[i]);
    if (Number.isNaN(timestamp.getTime())) continue;
    if (timestamp.getTime() < now) continue;
    samples.push({
      time: hourly.time[i],
      probability: hourly.precipitation_probability?.[i] ?? 0,
      amount: hourly.precipitation?.[i] ?? 0,
      label: timestamp.toLocaleTimeString([], { hour: 'numeric', timeZone })
    });
  }

  return samples.length > 0 ? samples : undefined;
}

function computeNextRainMinutes(samples: RainSample[] | undefined) {
  if (!samples || samples.length === 0) return null;
  const now = Date.now();
  const next = samples.find((sample) => {
    const ts = new Date(sample.time).getTime();
    if (Number.isNaN(ts) || ts < now) return false;
    return sample.probability >= 40 || sample.amount > 0;
  });
  if (!next) return null;
  const ts = new Date(next.time).getTime();
  if (Number.isNaN(ts)) return null;
  const diff = ts - now;
  if (diff < 0) return null;
  return Math.floor(diff / 60000);
}

function buildRainGraphData(samples: RainSample[]): RainGraphData | null {
  if (samples.length < 2) return null;

  const maxAmount = Math.max(...samples.map((sample) => sample.amount));
  const safeAmountMax = Math.max(maxAmount, 1);
  const slotWidth = 100 / samples.length;
  const barWidth = Math.max(slotWidth - 1, slotWidth * 0.6);
  const probabilityLine = samples
    .map((sample, index) => {
      const x = (index / (samples.length - 1)) * 100;
      const y = 100 - Math.min(Math.max(sample.probability, 0), 100);
      return `${x},${y}`;
    })
    .join(' ');

  const bars = maxAmount > 0
    ? samples.map((sample, index) => {
        const height = (Math.max(sample.amount, 0) / safeAmountMax) * 60;
        const x = index * slotWidth + (slotWidth - barWidth) / 2;
        const y = 100 - height;
        return {
          key: sample.time,
          x,
          width: barWidth,
          height,
          y
        };
      })
    : [];

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

  return { probabilityLine, bars, ticks, maxAmount };
}

function formatDay(dateString: string, timeZone: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString([], { weekday: 'short', timeZone });
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

function formatTime(value: string | null | undefined, timeZone: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone });
}
