import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Fetch a single event
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        dateStarted: event.dateStarted.toISOString(),
        timeStart: event.timeStart,
        timeEnd: event.timeEnd,
        details: event.details || undefined,
        categories: JSON.parse(event.categories || '[]'),
        createdAt: event.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

// PUT - Update an event
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, dateStarted, timeStart, timeEnd, details, categories } = body;

    const event = await prisma.event.update({
      where: { id },
      data: {
        title,
        dateStarted: new Date(dateStarted),
        timeStart,
        timeEnd,
        details: details || null,
        categories: JSON.stringify(categories || []),
      },
    });

    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        dateStarted: event.dateStarted.toISOString(),
        timeStart: event.timeStart,
        timeEnd: event.timeEnd,
        details: event.details || undefined,
        categories: JSON.parse(event.categories || '[]'),
        createdAt: event.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

// DELETE - Hard delete an event
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Hard delete - permanently removes from database
    await prisma.event.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Event deleted permanently' });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
