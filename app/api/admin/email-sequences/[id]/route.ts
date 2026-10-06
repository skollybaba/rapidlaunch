import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAdmin } from '@/lib/auth/admin';
import { getSequenceById, updateSequence, deleteSequence } from '@/lib/services/sequence-service';
import { updateEmailSequenceSchema } from '@/lib/validation/email-sequence';

const paramsSchema = z.object({
  id: z.string().min(1),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const parsed = paramsSchema.safeParse({ id });
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { message: 'Invalid sequence id' } },
        { status: 400 }
      );
    }

    const sequence = await getSequenceById(parsed.data.id);
    if (!sequence) {
      return NextResponse.json(
        { ok: false, error: { message: 'Sequence not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: sequence });
  } catch (error) {
    console.error('Error fetching sequence:', error);
    return NextResponse.json(
      { ok: false, error: { message: 'Failed to fetch sequence' } },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const body = await req.json();
    const parsed = updateEmailSequenceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: 'Validation failed',
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const sequence = await updateSequence(parsedParams.data.id, parsed.data);
    if (!sequence) {
      return NextResponse.json(
        { ok: false, error: { message: 'Sequence not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: sequence });
  } catch (error) {
    console.error('Error updating sequence:', error);
    return NextResponse.json(
      { ok: false, error: { message: 'Failed to update sequence' } },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const parsed = paramsSchema.safeParse({ id });
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { message: 'Invalid sequence id' } },
        { status: 400 }
      );
    }

    const success = await deleteSequence(parsed.data.id);
    if (!success) {
      return NextResponse.json(
        { ok: false, error: { message: 'Sequence not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (error) {
    console.error('Error deleting sequence:', error);
    return NextResponse.json(
      { ok: false, error: { message: 'Failed to delete sequence' } },
      { status: 500 }
    );
  }
}
