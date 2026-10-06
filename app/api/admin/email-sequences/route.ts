import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { createSequence, listSequences } from '@/lib/services/sequence-service';
import { createEmailSequenceSchema } from '@/lib/validation/email-sequence';

export async function GET() {
  try {
    await requireAdmin();
    const sequences = await listSequences();
    return NextResponse.json({ ok: true, data: sequences });
  } catch (error) {
    console.error('Error fetching sequences:', error);
    return NextResponse.json(
      { ok: false, error: { message: 'Failed to fetch sequences' } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = createEmailSequenceSchema.safeParse(body);

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

    const sequence = await createSequence(parsed.data);
    return NextResponse.json({ ok: true, data: sequence }, { status: 201 });
  } catch (error) {
    console.error('Error creating sequence:', error);
    return NextResponse.json(
      { ok: false, error: { message: 'Failed to create sequence' } },
      { status: 500 }
    );
  }
}
