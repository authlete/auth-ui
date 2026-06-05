/**
 * TanStack Query factory — SSR-safe per the canonical Next.js pattern.
 * Fresh client per server request; singleton in the browser.
 * https://better-auth-ui.com/docs/shadcn/integrations/nextjs
 */

import { QueryClient } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 5000 },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
