import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Fetch all urgent concerns
export async function GET() {
  try {
    const urgentConcerns = await prisma.urgentConcern.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Transform to match the frontend interface
    const transformedConcerns = urgentConcerns.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description || undefined,
      createdAt: c.createdAt.toISOString(),
    }));

    return NextResponse.json({ urgentConcerns: transformedConcerns });
  } catch (error) {
    console.error('Error fetching urgent concerns:', error);
    return NextResponse.json({ error: 'Failed to fetch urgent concerns' }, { status: 500 });
  }
}

// POST - Create a new urgent concern
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description } = body;

    const concern = await prisma.urgentConcern.create({
      data: {
        title,
        description: description || null,
      },
    });

    return NextResponse.json({
      urgentConcern: {
        id: concern.id,
        title: concern.title,
        description: concern.description || undefined,
        createdAt: concern.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating urgent concern:', error);
    return NextResponse.json({ error: 'Failed to create urgent concern' }, { status: 500 });
  }
}
