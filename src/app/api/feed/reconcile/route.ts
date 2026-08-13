import { NextRequest, NextResponse } from 'next/server';
import { reconcile } from '@/lib/server/reconcile';
import { getDiscoveredSellers } from '@/lib/server/discovered-sellers';
import { hasApiKey, isAuthError, MissingApiKeyError, reconcileCursor } from '@/lib/server/jetstream';
import { requireAdmin } from '@/lib/server/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * Run the archive reconcile, or report on the last one.
 *
 * Admin-gated on both verbs. The job spends metered Jetstream quota and can
 * remove entries from the live feed, so it is not something an anonymous caller
 * gets to trigger — and the review queue it produces is a list of accounts that
 * have not asked to be listed anywhere.
 *
 * The scheduled function at netlify/functions/reconcile.mts is the ordinary
 * caller; POSTing by hand is for backfilling and for looking at what a run does
 * before trusting it to a schedule.
 */
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  let body: { budgetMs?: number; maxEvents?: number; afterSeq?: number } = {};
  try {
    body = await req.json();
  } catch {
    // An empty body is the normal case for the scheduled caller.
  }

  try {
    const result = await reconcile({
      budgetMs: body.budgetMs,
      maxEvents: body.maxEvents,
      afterSeq: body.afterSeq,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    // Both of these are 503 rather than 500: the code is fine, the deployment's
    // key is missing or wrong, and the fix is a Netlify environment variable.
    // Separated in the message because "you have no key" and "your key was
    // rejected" send you to different places.
    if (error instanceof MissingApiKeyError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (isAuthError(error)) {
      return NextResponse.json(
        { error: 'Jetstream rejected JETSTREAM_API_KEY' },
        { status: 503 }
      );
    }
    console.error('reconcile failed', error);
    return NextResponse.json({ error: 'Reconcile failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const [cursor, discovered] = await Promise.all([
    reconcileCursor.load(),
    getDiscoveredSellers(),
  ]);

  return NextResponse.json({
    configured: hasApiKey(),
    cursor: cursor ?? null,
    discoveredSellers: discovered.filter((s) => !s.reviewed),
    reviewedCount: discovered.filter((s) => s.reviewed).length,
  });
}
