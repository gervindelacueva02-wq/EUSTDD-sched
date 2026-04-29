import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function safeJsonParse(str: string | null | undefined, fallback: unknown = null) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// GET - Fetch only events
export async function GET() {
  try {
    const data = await prisma.scheduleData.findUnique({
      where: { id: 'main' },
      select: { events: true },
    });

    const events = safeJsonParse(data?.events, []);

    // Add cache headers for 30 seconds
    return NextResponse.json(events, {
      headers: {
        'Cache-Control': 'private, max-age=30',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST - Save only events
export async function POST(request: Request) {
  try {
    const events = await request.json();

    const data = await prisma.scheduleData.upsert({
      where: { id: 'main' },
      update: { events: JSON.stringify(events || []) },
      create: {
        id: 'main',
        events: JSON.stringify(events || []),
        personnel: '[]',
        projects: '[]',
        tickerMessages: '[]',
        urgentConcerns: '[]',
        settings: '{}',
      },
      select: { events: true },
    });

    return NextResponse.json(safeJsonParse(data.events, []));
  } catch (error) {
    console.error('Error saving events:', error);
    return NextResponse.json([], { status: 500 });
  }
}
