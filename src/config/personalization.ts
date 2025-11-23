import examplePersonalization from './personalization.example.json';

export type WeatherLocationConfig = {
  latitude: number;
  longitude: number;
  label?: string;
};

export type PersonalizationConfig = {
  displayName?: string;
  weatherLocation?: WeatherLocationConfig | null;
};

const localModules = import.meta.glob('./personalization.local.json', { eager: true }) as Record<
  string,
  { default: PersonalizationConfig }
>;

const personalizationConfig: PersonalizationConfig = {
  ...(examplePersonalization as PersonalizationConfig),
  ...(localModules['./personalization.local.json']?.default ?? {})
};

export default personalizationConfig;
