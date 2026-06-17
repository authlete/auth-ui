/**
 * White-label brand configuration — the single source of truth for every
 * brand-specific value the UI renders: product name, logo, font, colors, and
 * the sign-in panel copy.
 *
 * To rebrand: point `activeBrand` at a different preset (or edit one), and drop
 * a logo into /public/brand. Nothing else in the codebase hardcodes a brand
 * value — colors flow into CSS variables via `brandCssVars`, and copy/assets
 * are read from here. A customer can also replace this UI wholesale, as long as
 * it speaks the same authorization protocol to the AS.
 */

import { neutral } from "./presets/neutral";

/** Brand-carrying colors that differ between light and dark mode. */
export type ColorScheme = {
  /** Primary action color — buttons, links. */
  primary: string;
  primaryForeground: string;
  /** Focus ring. */
  ring: string;
};

export type Brand = {
  /** Shown in the top bar, the panel, and the document title. */
  productName: string;
  /** Logo image path under /public. Falls back to a neutral built-in mark. */
  logoMark?: string;
  /** CSS font-family stack applied as --font-sans. */
  fontFamily: string;
  /** Highlight color on the (always-dark) sign-in panel. */
  accent: string;
  light: ColorScheme;
  dark: ColorScheme;
  panel: {
    /** CSS `background` for the sign-in panel — solid color or gradient. */
    background: string;
    headline: string;
    subhead: string;
    bullets: string[];
    footer: string;
  };
};

/** The brand the app renders. Swap this to rebrand. */
export const activeBrand: Brand = neutral;

/**
 * Serializes a brand's tokens into a CSS string for injection at the document
 * root (see layout.tsx). Brand-carrying tokens live here, not in globals.css,
 * so this config stays the single source of truth. Inputs are trusted, in-repo
 * constants — safe to inline into a <style> tag.
 */
export function brandCssVars(b: Brand): string {
  return `
:root {
  --font-sans: ${b.fontFamily};
  --brand-accent: ${b.accent};
  --brand-panel: ${b.panel.background};
  --primary: ${b.light.primary};
  --primary-foreground: ${b.light.primaryForeground};
  --ring: ${b.light.ring};
}
.dark {
  --primary: ${b.dark.primary};
  --primary-foreground: ${b.dark.primaryForeground};
  --ring: ${b.dark.ring};
}`;
}
