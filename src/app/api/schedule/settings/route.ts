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

// GET - Fetch only settings
export async function GET() {
  try {
    const data = await prisma.scheduleData.findUnique({
      where: { id: 'main' },
      select: { settings: true },
    });

    const settings = safeJsonParse(data?.settings, {
      theme: 'light',
      transitionStyle: 'static',
      transitionSpeed: 'normal',
      customTransitionSeconds: 3,
      smoothScrollEnabled: true,
      statusColors: {
        upcoming: '#3b82f6',
        ongoing: '#22c55e',
        completed: '#9ca3af',
      },
      pinEnabled: false,
      pin: '',
    });

    return NextResponse.json(settings, {
      headers: {
        'Cache-Control': 'private, max-age=60',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({}, { status: 500 });
  }
}

// POST - Save only settings
export async function POST(request: Request) {
  try {
    const settings = await request.json();

    const data = await prisma.scheduleData.upsert({
      where: { id: 'main' },
      update: { settings: JSON.stringify(settings || {}) },
      create: {
        id: 'main',
        settings: JSON.stringify(settings || {}),
        events: '[]',
        personnel: '[]',
        projects: '[]',
        tickerMessages: '[]',
        urgentConcerns: '[]',
      },
      select: { settings: true },
    });

    return NextResponse.json(safeJsonParse(data.settings, {}));
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({}, { status: 500 });
  }
}
