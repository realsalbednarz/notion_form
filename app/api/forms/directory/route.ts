import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client-postgres';
import { formConfigs } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

// GET /api/forms/directory - List all forms (public, no auth required)
// This returns a limited set of fields for the public directory
export async function GET() {
  try {
    const forms = await db.query.formConfigs.findMany({
      orderBy: [desc(formConfigs.updatedAt)],
      columns: {
        id: true,
        name: true,
        description: true,
        mode: true,
        updatedAt: true,
        config: true,
      },
    });

    // Parse config JSON and extract only public-facing info
    const publicForms = forms.map((form) => {
      const config = JSON.parse(form.config);
      return {
        id: form.id,
        name: form.name,
        description: form.description,
        mode: form.mode,
        updatedAt: form.updatedAt,
        // Extract display titles if available
        listTitle: config.displayTitles?.listTitle,
        createTitle: config.displayTitles?.createTitle,
        // Permissions info
        permissions: {
          allowCreate: config.permissions?.allowCreate !== false,
          allowEdit: config.permissions?.allowEdit === true,
          allowList: config.permissions?.allowList === true,
        },
      };
    });

    return NextResponse.json({ forms: publicForms });
  } catch (error) {
    console.error('Error fetching forms directory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forms' },
      { status: 500 }
    );
  }
}
