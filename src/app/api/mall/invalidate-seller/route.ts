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

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
}
