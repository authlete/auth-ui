/**
 * Better Auth client. Used in client components for sign-in, sign-up,
 * session queries, etc.
 */

"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
