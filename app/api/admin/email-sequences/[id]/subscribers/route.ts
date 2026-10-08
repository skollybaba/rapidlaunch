import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAdmin } from '@/lib/auth/admin';
import { listSequenceSubscribers } from '@/lib/services/sequence-service';

const paramsSchema = z.object({
  id: z.string().min(1),
});

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const parsedParams = paramsSchema.safeParse({ id });
    if (!parsedParams.success) {
      return NextResponse.json(
        { ok: false, error: { message: 'Invalid sequence id' } },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const parsedQuery = querySchema.safeParse({
      limit: url.searchParams.get('limit') ?? undefined,
      skip: url.searchParams.get('skip') ?? undefined,
    });
    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: 'Invalid query parameters',
            details: parsedQuery.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const data = await listSequenceSubscribers(parsedParams.data.id, parsedQuery.data);

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error('Error listing sequence subscribers:', error);
    return NextResponse.json(
      { ok: false, error: { message: 'Failed to list subscribers' } },
      { status: 500 }
    );
  }
}