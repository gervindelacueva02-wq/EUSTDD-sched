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

// GET - Fetch only ticker messages
export async function GET() {
  try {
    const data = await prisma.scheduleData.findUnique({
      where: { id: 'main' },
      select: { tickerMessages: true },
    });

    const tickerMessages = safeJsonParse(data?.tickerMessages, []);

    return NextResponse.json(tickerMessages, {
      headers: {
        'Cache-Control': 'private, max-age=30',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching ticker messages:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST - Save only ticker messages
export async function POST(request: Request) {
  try {
    const tickerMessages = await request.json();

    const data = await prisma.scheduleData.upsert({
      where: { id: 'main' },
      update: { tickerMessages: JSON.stringify(tickerMessages || []) },
      create: {
        id: 'main',
        tickerMessages: JSON.stringify(tickerMessages || []),
        events: '[]',
        personnel: '[]',
        projects: '[]',
        urgentConcerns: '[]',
        settings: '{}',
      },
      select: { tickerMessages: true },
    });

    return NextResponse.json(safeJsonParse(data.tickerMessages, []));
  } catch (error) {
    console.error('Error saving ticker messages:', error);
    return NextResponse.json([], { status: 500 });
  }
}
