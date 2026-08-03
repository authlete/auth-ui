import type { Brand } from "../brand";

const SYSTEM_SANS =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/**
 * The default, unbranded look. Neutral slate palette, system font, generic
 * mark and copy. Intentionally plain — it is the canvas a customer rebrands,
 * not a finished identity.
 */
export const neutral: Brand = {
  productName: "Auth UI",
  fontFamily: SYSTEM_SANS,
  accent: "hsl(215 20% 65%)",
  light: {
    primary: "hsl(222.2 47.4% 11.2%)",
    primaryForeground: "hsl(210 40% 98%)",
    ring: "hsl(222.2 47.4% 11.2%)",
  },
  dark: {
    primary: "hsl(210 40% 98%)",
    primaryForeground: "hsl(222.2 47.4% 11.2%)",
    ring: "hsl(210 40% 90%)",
  },
  panel: {
    background: "linear-gradient(135deg, hsl(222 30% 11%) 0%, hsl(222 24% 18%) 100%)",
    headline: "A white-label sign-in experience.",
    subhead: "Unbranded by default — themeable from a single config, or replace it entirely.",
    bullets: [],
    footer: "Reference UI · swap in your brand",
  },
};
