import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Fetch all events
export async function GET() {
  try {
    const events = await prisma.event.findMany({
      orderBy: { dateStarted: 'asc' },
    });

    // Transform to match the frontend interface
    const transformedEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      dateStarted: event.dateStarted.toISOString(),
      timeStart: event.timeStart,
      timeEnd: event.timeEnd,
      details: event.details || undefined,
      categories: JSON.parse(event.categories || '[]'),
      createdAt: event.createdAt.toISOString(),
    }));

    return NextResponse.json({ events: transformedEvents });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

// POST - Create a new event
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, dateStarted, timeStart, timeEnd, details, categories } = body;

    const event = await prisma.event.create({
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
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
