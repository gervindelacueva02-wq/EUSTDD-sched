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

// GET - Fetch only urgent concerns
export async function GET() {
  try {
    const data = await prisma.scheduleData.findUnique({
      where: { id: 'main' },
      select: { urgentConcerns: true },
    });

    const urgentConcerns = safeJsonParse(data?.urgentConcerns, []);

    return NextResponse.json(urgentConcerns, {
      headers: {
        'Cache-Control': 'private, max-age=30',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching urgent concerns:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST - Save only urgent concerns
export async function POST(request: Request) {
  try {
    const urgentConcerns = await request.json();

    const data = await prisma.scheduleData.upsert({
      where: { id: 'main' },
      update: { urgentConcerns: JSON.stringify(urgentConcerns || []) },
      create: {
        id: 'main',
        urgentConcerns: JSON.stringify(urgentConcerns || []),
        events: '[]',
        personnel: '[]',
        projects: '[]',
        tickerMessages: '[]',
        settings: '{}',
      },
      select: { urgentConcerns: true },
    });

    return NextResponse.json(safeJsonParse(data.urgentConcerns, []));
  } catch (error) {
    console.error('Error saving urgent concerns:', error);
    return NextResponse.json([], { status: 500 });
  }
}
