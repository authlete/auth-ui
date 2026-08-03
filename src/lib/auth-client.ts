/**
 * Better Auth client. Used in client components for sign-in, sign-up,
 * session queries, etc.
 */

"use client";

import { createAuthClient } from "better-auth/react";
import { multiSessionClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({ plugins: [multiSessionClient()] });

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
