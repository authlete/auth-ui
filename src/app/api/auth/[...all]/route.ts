/**
 * Better Auth's catch-all route handler. Mounts every better-auth endpoint
 * under /api/auth/* (sign-in, sign-up, sign-out, get-session, ok, etc.).
 */

import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
