/**
 * Motor de temas por tenant: 5 paletas curadas + colores/tipografías
 * personalizables. Se resuelve a variables CSS que el sitio público consume
 * en vivo (sin recargar la página).
 */
import type { ThemeConfig } from '@/domain/entities'

export interface ThemePaletteDef {
  id: string
  label: string
  description: string
  primary: string
  primaryForeground: string
  secondary: string
  accent: string
}

/** 5 paletas predefinidas (sin azules/índigos por decisión de diseño). */
export const THEME_PALETTES: ThemePaletteDef[] = [
  {
    id: 'turquesa',
    label: 'Turquesa Clínico',
    description: 'Fresco y profesional — el clásico dental.',
    primary: '#0f766e',
    primaryForeground: '#ffffff',
    secondary: '#f0fdfa',
    accent: '#5eead4',
  },
  {
    id: 'esmeralda',
    label: 'Esmeralda Serena',
    description: 'Natural, calmado y confiable.',
    primary: '#047857',
    primaryForeground: '#ffffff',
    secondary: '#ecfdf5',
    accent: '#6ee7b7',
  },
  {
    id: 'vino',
    label: 'Vino Elegante',
    description: 'Sofisticado, ideal para clínica premium.',
    primary: '#9f1239',
    primaryForeground: '#ffffff',
    secondary: '#fff1f2',
    accent: '#fda4af',
  },
  {
    id: 'ambar',
    label: 'Ámbar Cálido',
    description: 'Cercano y humano, alta conversión.',
    primary: '#b45309',
    primaryForeground: '#ffffff',
    secondary: '#fffbeb',
    accent: '#fcd34d',
  },
  {
    id: 'violeta',
    label: 'Violeta Moderno',
    description: 'Moderno y diferenciador.',
    primary: '#6d28d9',
    primaryForeground: '#ffffff',
    secondary: '#f5f3ff',
    accent: '#c4b5fd',
  },
]

/** 4 tipografías curadas (cargadas vía Google Fonts con fallback de sistema). */
export interface ThemeFontDef {
  id: string
  label: string
  description: string
  stack: string
}

export const THEME_FONTS: ThemeFontDef[] = [
  {
    id: 'inter',
    label: 'Inter',
    description: 'Neutra y legible (cuerpo y títulos).',
    stack: "'Inter', ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: 'poppins',
    label: 'Poppins',
    description: 'Geométrica y amable — ideal dental.',
    stack: "'Poppins', 'Inter', ui-sans-serif, sans-serif",
  },
  {
    id: 'playfair',
    label: 'Playfair Display',
    description: 'Elegante editorial para títulos premium.',
    stack: "'Playfair Display', Georgia, serif",
  },
  {
    id: 'montserrat',
    label: 'Montserrat',
    description: 'Institucional y sólida.',
    stack: "'Montserrat', 'Inter', ui-sans-serif, sans-serif",
  },
]

export const DEFAULT_THEME: ThemeConfig = {
  palette: 'turquesa',
  primary: '#0f766e',
  primaryForeground: '#ffffff',
  secondary: '#f0fdfa',
  accent: '#5eead4',
  fontHeading: 'poppins',
  fontBody: 'inter',
  radius: '1rem',
}

/** Merge tolerante (regla #4): lo que falte usa el default. */
export function resolveTheme(input: unknown): ThemeConfig {
  const t = (input ?? {}) as Partial<ThemeConfig>
  const hex = (v: unknown, fallback: string) =>
    typeof v === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ? v : fallback
  const fontId = (v: unknown, fallback: string) =>
    typeof v === 'string' && THEME_FONTS.some((f) => f.id === v) ? v : fallback
  const paletteId = (v: unknown, fallback: string) =>
    typeof v === 'string' && THEME_PALETTES.some((p) => p.id === v) ? v : fallback
  return {
    palette: paletteId(t.palette, DEFAULT_THEME.palette),
    primary: hex(t.primary, DEFAULT_THEME.primary),
    primaryForeground: hex(t.primaryForeground, DEFAULT_THEME.primaryForeground),
    secondary: hex(t.secondary, DEFAULT_THEME.secondary),
    accent: hex(t.accent, DEFAULT_THEME.accent),
    fontHeading: fontId(t.fontHeading, DEFAULT_THEME.fontHeading),
    fontBody: fontId(t.fontBody, DEFAULT_THEME.fontBody),
    radius: typeof t.radius === 'string' && /^\d+(\.\d+)?(rem|px|em)$/.test(t.radius) ? t.radius : DEFAULT_THEME.radius,
  }
}

export function fontStack(id: string): string {
  return THEME_FONTS.find((f) => f.id === id)?.stack ?? THEME_FONTS[0].stack
}

/** Tema → variables CSS (se aplican inline al wrapper del sitio público). */
export function themeToCssVars(theme: ThemeConfig): Record<string, string> {
  return {
    '--t-primary': theme.primary,
    '--t-primary-fg': theme.primaryForeground,
    '--t-secondary': theme.secondary,
    '--t-accent': theme.accent,
    '--t-radius': theme.radius,
    '--font-heading': fontStack(theme.fontHeading),
    '--font-body': fontStack(theme.fontBody),
  }
}
