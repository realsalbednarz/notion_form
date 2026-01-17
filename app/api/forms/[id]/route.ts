import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client-postgres';
import { formConfigs } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

// GET /api/forms/[id] - Get a specific form
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const form = await db.query.formConfigs.findFirst({
      where: and(
        eq(formConfigs.id, params.id),
        eq(formConfigs.userId, user.id)
      ),
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    return NextResponse.json({
      form: {
        ...form,
        config: JSON.parse(form.config),
      },
    });
  } catch (error) {
    console.error('Error fetching form:', error);
    return NextResponse.json(
      { error: 'Failed to fetch form' },
      { status: 500 }
    );
  }
}

// PUT /api/forms/[id] - Update a form
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // First check if form exists and belongs to user
    const existingForm = await db.query.formConfigs.findFirst({
      where: and(
        eq(formConfigs.id, params.id),
        eq(formConfigs.userId, user.id)
      ),
    });

    if (!existingForm) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, viewId, mode, config } = body;

    const [updatedForm] = await db.update(formConfigs)
      .set({
        name: name ?? existingForm.name,
        description: description !== undefined ? description : existingForm.description,
        viewId: viewId !== undefined ? viewId : existingForm.viewId,
        mode: mode ?? existingForm.mode,
        config: config ? JSON.stringify(config) : existingForm.config,
        updatedAt: new Date(),
      })
      .where(eq(formConfigs.id, params.id))
      .returning();

    return NextResponse.json({
      form: {
        ...updatedForm,
        config: JSON.parse(updatedForm.config),
      },
    });
  } catch (error) {
    console.error('Error updating form:', error);
    return NextResponse.json(
      { error: 'Failed to update form' },
      { status: 500 }
    );
  }
}

// DELETE /api/forms/[id] - Delete a form
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // First check if form exists and belongs to user
    const existingForm = await db.query.formConfigs.findFirst({
      where: and(
        eq(formConfigs.id, params.id),
        eq(formConfigs.userId, user.id)
      ),
    });

    if (!existingForm) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    await db.delete(formConfigs)
      .where(eq(formConfigs.id, params.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting form:', error);
    return NextResponse.json(
      { error: 'Failed to delete form' },
      { status: 500 }
    );
  }
}
