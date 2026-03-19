import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Fetch a single urgent concern
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const concern = await prisma.urgentConcern.findUnique({
      where: { id },
    });

    if (!concern) {
      return NextResponse.json({ error: 'Urgent concern not found' }, { status: 404 });
    }

    return NextResponse.json({
      urgentConcern: {
        id: concern.id,
        title: concern.title,
        description: concern.description || undefined,
        createdAt: concern.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching urgent concern:', error);
    return NextResponse.json({ error: 'Failed to fetch urgent concern' }, { status: 500 });
  }
}

// PUT - Update an urgent concern
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description } = body;

    const concern = await prisma.urgentConcern.update({
      where: { id },
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
    console.error('Error updating urgent concern:', error);
    return NextResponse.json({ error: 'Failed to update urgent concern' }, { status: 500 });
  }
}

// DELETE - Hard delete an urgent concern (manual delete only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Hard delete - permanently removes from database
    await prisma.urgentConcern.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Urgent concern deleted permanently' });
  } catch (error) {
    console.error('Error deleting urgent concern:', error);
    return NextResponse.json({ error: 'Failed to delete urgent concern' }, { status: 500 });
  }
}
