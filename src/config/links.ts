import exampleLinks from './links.example.json';

const localModules = import.meta.glob('./links.local.json', { eager: true }) as Record<
  string,
  { default: typeof exampleLinks }
>;

const linksConfig = localModules['./links.local.json']?.default ?? exampleLinks;

export type LinkConfig = (typeof linksConfig)[number];

export default linksConfig;
