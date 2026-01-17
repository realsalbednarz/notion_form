import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client-postgres';
import { formConfigs } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';

// GET /api/forms - List all forms for the current user
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const forms = await db.query.formConfigs.findMany({
      where: eq(formConfigs.userId, user.id),
      orderBy: [desc(formConfigs.updatedAt)],
    });

    // Parse config JSON for each form
    const formsWithParsedConfig = forms.map((form) => ({
      ...form,
      config: JSON.parse(form.config),
    }));

    return NextResponse.json({ forms: formsWithParsedConfig });
  } catch (error) {
    console.error('Error fetching forms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forms' },
      { status: 500 }
    );
  }
}

// POST /api/forms - Create a new form
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, databaseId, viewId, mode, config } = body;

    if (!name || !databaseId || !mode || !config) {
      return NextResponse.json(
        { error: 'Missing required fields: name, databaseId, mode, config' },
        { status: 400 }
      );
    }

    const [newForm] = await db.insert(formConfigs)
      .values({
        userId: user.id,
        name,
        description: description || null,
        databaseId,
        viewId: viewId || null,
        mode,
        config: JSON.stringify(config),
      })
      .returning();

    return NextResponse.json({
      form: {
        ...newForm,
        config: JSON.parse(newForm.config),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating form:', error);
    return NextResponse.json(
      { error: 'Failed to create form' },
      { status: 500 }
    );
  }
}
