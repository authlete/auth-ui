/**
 * Better Auth client. Used in client components for sign-in, sign-up,
 * session queries, etc.
 */

"use client";

import { createAuthClient } from "better-auth/react";
import { multiSessionClient, twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [multiSessionClient(), twoFactorClient()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
