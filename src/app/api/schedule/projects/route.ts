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

// GET - Fetch only projects
export async function GET() {
  try {
    const data = await prisma.scheduleData.findUnique({
      where: { id: 'main' },
      select: { projects: true },
    });

    const projects = safeJsonParse(data?.projects, []);

    return NextResponse.json(projects, {
      headers: {
        'Cache-Control': 'private, max-age=60',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST - Save only projects
export async function POST(request: Request) {
  try {
    const projects = await request.json();

    const data = await prisma.scheduleData.upsert({
      where: { id: 'main' },
      update: { projects: JSON.stringify(projects || []) },
      create: {
        id: 'main',
        projects: JSON.stringify(projects || []),
        events: '[]',
        personnel: '[]',
        tickerMessages: '[]',
        urgentConcerns: '[]',
        settings: '{}',
      },
      select: { projects: true },
    });

    return NextResponse.json(safeJsonParse(data.projects, []));
  } catch (error) {
    console.error('Error saving projects:', error);
    return NextResponse.json([], { status: 500 });
  }
}
