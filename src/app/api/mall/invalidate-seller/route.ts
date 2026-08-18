import { revalidatePath } from 'next/cache';
import { invalidateSeller } from '@/lib/mall-cache';

export async function POST(request: Request) {
  try {
    const { did } = await request.json();

    if (!did || typeof did !== 'string') {
      return Response.json({ error: 'Missing did' }, { status: 400 });
    }

    invalidateSeller(did);
    revalidatePath('/mall');
    // /browse is prerendered on a one-minute revalidate now, so without this a
    // seller would publish a listing and not find it on the page they were just
    // looking at. Purging here means the wait applies only to listings that
    // arrive from the firehose, never to the one the visitor just created.
    revalidatePath('/browse');

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
}
