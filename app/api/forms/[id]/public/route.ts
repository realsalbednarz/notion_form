import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client-postgres';
import { formConfigs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/forms/[id]/public - Get form config for public display (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const form = await db.query.formConfigs.findFirst({
      where: eq(formConfigs.id, params.id),
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Return only public-safe fields
    return NextResponse.json({
      form: {
        id: form.id,
        name: form.name,
        description: form.description,
        databaseId: form.databaseId,
        mode: form.mode,
        config: JSON.parse(form.config),
      },
    });
  } catch (error) {
    console.error('Error fetching public form:', error);
    return NextResponse.json(
      { error: 'Failed to fetch form' },
      { status: 500 }
    );
  }
}
