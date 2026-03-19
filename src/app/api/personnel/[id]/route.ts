import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Fetch a single personnel
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const personnel = await prisma.personnel.findUnique({
      where: { id },
    });

    if (!personnel) {
      return NextResponse.json({ error: 'Personnel not found' }, { status: 404 });
    }

    return NextResponse.json({
      personnel: {
        id: personnel.id,
        name: personnel.name,
        type: personnel.type,
        dateStart: personnel.dateStart.toISOString(),
        dateEnd: personnel.dateEnd.toISOString(),
        location: personnel.location || undefined,
        createdAt: personnel.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching personnel:', error);
    return NextResponse.json({ error: 'Failed to fetch personnel' }, { status: 500 });
  }
}

// PUT - Update a personnel
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, type, dateStart, dateEnd, location } = body;

    const personnel = await prisma.personnel.update({
      where: { id },
      data: {
        name,
        type,
        dateStart: new Date(dateStart),
        dateEnd: new Date(dateEnd),
        location: location || null,
      },
    });

    return NextResponse.json({
      personnel: {
        id: personnel.id,
        name: personnel.name,
        type: personnel.type,
        dateStart: personnel.dateStart.toISOString(),
        dateEnd: personnel.dateEnd.toISOString(),
        location: personnel.location || undefined,
        createdAt: personnel.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error updating personnel:', error);
    return NextResponse.json({ error: 'Failed to update personnel' }, { status: 500 });
  }
}

// DELETE - Hard delete a personnel (manual delete for OTHER type)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Hard delete - permanently removes from database
    await prisma.personnel.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Personnel deleted permanently' });
  } catch (error) {
    console.error('Error deleting personnel:', error);
    return NextResponse.json({ error: 'Failed to delete personnel' }, { status: 500 });
  }
}
