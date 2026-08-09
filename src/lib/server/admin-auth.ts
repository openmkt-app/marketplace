// src/lib/server/admin-auth.ts
//
// The gate on admin-only endpoints: banner, moderation, curated feed posts, and
// feed setup.
//
// These used to "authenticate" by comparing a `handle` field in the request
// body against the admin handle — a public string anyone could send. That is no
// authentication at all: it let any caller set the site-wide banner, flag or
// unflag any listing, and inject posts into the feed. This replaces it with a
// shared secret the admin holds, sent as a bearer token.
//
// The secret lives only in ADMIN_API_SECRET on the server and in the admin's
// own browser session — never in the shipped client bundle. If the variable is
// unset the check denies everything, so a misconfiguration fails closed rather
// than leaving the old hole open under a new name.

import { timingSafeEqual } from 'node:crypto';

// Typed against the web-standard Request/Response, not next/server. NextRequest
// extends Request, so routes pass their `req` straight in, and this stays
// importable in a plain test without pulling the Next runtime along with it.

/** Constant-time string compare. Length is allowed to leak; the bytes are not. */
function secretsMatch(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Whether a request carries the admin bearer secret. */
export function isAdminRequest(req: Request): boolean {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) return false; // fail closed — no secret configured means no admin

  const auth = req.headers.get('authorization') || '';
  const prefix = 'Bearer ';
  if (!auth.startsWith(prefix)) return false;

  return secretsMatch(auth.slice(prefix.length), secret);
}

/**
 * Guard for an admin route: returns a 401 response to return early, or null to
 * proceed. Keeps every route's check identical and impossible to get subtly
 * wrong one at a time.
 */
export function requireAdmin(req: Request): Response | null {
  if (isAdminRequest(req)) return null;
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
