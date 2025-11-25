type BackgroundTheme = {
  light: string;
  dark: string;
  name: string;
};

export const BACKGROUND_THEMES: Record<string, BackgroundTheme> = {
  forest: {
    name: 'Forest',
    light: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2560&auto=format&fit=crop',
    dark: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2560&auto=format&fit=crop'
  },
  ocean: {
    name: 'Ocean',
    light: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?q=80&w=2560&auto=format&fit=crop',
    dark: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?q=80&w=2560&auto=format&fit=crop'
  },
  mountains: {
    name: 'Mountains',
    light: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2560&auto=format&fit=crop',
    dark: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2560&auto=format&fit=crop'
  },
  desert: {
    name: 'Desert',
    light: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?q=80&w=2560&auto=format&fit=crop',
    dark: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=2560&auto=format&fit=crop'
  },
  aurora: {
    name: 'Aurora',
    light: 'https://images.unsplash.com/photo-1579033461380-adb47c3eb938?q=80&w=2560&auto=format&fit=crop',
    dark: 'https://images.unsplash.com/photo-1483347756197-71ef80e95f73?q=80&w=2560&auto=format&fit=crop'
  },
  sakura: {
    name: 'Sakura',
    light: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?q=80&w=2560&auto=format&fit=crop',
    dark: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2560&auto=format&fit=crop'
  },
  cityscape: {
    name: 'Cityscape',
    light: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=2560&auto=format&fit=crop',
    dark: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=2560&auto=format&fit=crop'
  },
  lavender: {
    name: 'Lavender',
    light: 'https://images.unsplash.com/photo-1499002238440-d264edd596ec?q=80&w=2560&auto=format&fit=crop',
    dark: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?q=80&w=2560&auto=format&fit=crop'
  }
};

type GlassBackgroundProps = {
  themeKey?: string;
};

export function GlassBackground({ themeKey = 'forest' }: GlassBackgroundProps) {
  const backgrounds = BACKGROUND_THEMES[themeKey] || BACKGROUND_THEMES.forest;

  return (
    <div className="fixed inset-0 z-0">
      {/* Light theme background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500 dark:opacity-0"
        style={{
          backgroundImage: `url('${backgrounds.light}')`,
        }}
      />

      {/* Dark theme background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-0 transition-opacity duration-500 dark:opacity-100"
        style={{
          backgroundImage: `url('${backgrounds.dark}')`,
        }}
      />

      {/* Overlay for better glass contrast and text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/10 to-black/40 dark:from-black/50 dark:via-black/30 dark:to-black/60" />

      {/* Optional: Subtle animated grain texture for depth */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay dark:opacity-[0.05]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
