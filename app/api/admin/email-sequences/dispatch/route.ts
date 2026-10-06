import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/auth/admin';
import { dispatchEmailSequenceSteps } from '@/lib/services/sequence-dispatch-service';

export async function POST() {
  try {
    await requireAdmin();

    const result = await dispatchEmailSequenceSteps();
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    console.error('Error dispatching sequences:', error);
    return NextResponse.json(
      { ok: false, error: { message: 'Failed to dispatch sequences' } },
      { status: 500 }
    );
  }
}
