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

// GET - Fetch only personnel
export async function GET() {
  try {
    const data = await prisma.scheduleData.findUnique({
      where: { id: 'main' },
      select: { personnel: true },
    });

    const personnel = safeJsonParse(data?.personnel, []);

    return NextResponse.json(personnel, {
      headers: {
        'Cache-Control': 'private, max-age=30',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching personnel:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST - Save only personnel
export async function POST(request: Request) {
  try {
    const personnel = await request.json();

    const data = await prisma.scheduleData.upsert({
      where: { id: 'main' },
      update: { personnel: JSON.stringify(personnel || []) },
      create: {
        id: 'main',
        personnel: JSON.stringify(personnel || []),
        events: '[]',
        projects: '[]',
        tickerMessages: '[]',
        urgentConcerns: '[]',
        settings: '{}',
      },
      select: { personnel: true },
    });

    return NextResponse.json(safeJsonParse(data.personnel, []));
  } catch (error) {
    console.error('Error saving personnel:', error);
    return NextResponse.json([], { status: 500 });
  }
}
