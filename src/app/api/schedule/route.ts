import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Helper function to safely parse JSON
function safeJsonParse(str: string | null | undefined, fallback: unknown = null) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// GET - Fetch all schedule data
export async function GET() {
  try {
    let data = await prisma.scheduleData.findUnique({
      where: { id: 'main' },
    });

    // Create default data if not exists
    if (!data) {
      data = await prisma.scheduleData.create({
        data: {
          id: 'main',
          events: '[]',
          personnel: '[]',
          projects: '[]',
          tickerMessages: '[]',
          urgentConcerns: '[]',
          settings: JSON.stringify({
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
          }),
        },
      });
    }

    return NextResponse.json({
      events: safeJsonParse(data.events, []),
      personnelStatuses: safeJsonParse(data.personnel, []),
      projects: safeJsonParse(data.projects, []),
      tickerMessages: safeJsonParse(data.tickerMessages, []),
      urgentConcerns: safeJsonParse(data.urgentConcerns, []),
      settings: safeJsonParse(data.settings, {}),
    });
  } catch (error) {
    console.error('Error fetching schedule data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

// POST - Save all schedule data
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { events, personnelStatuses, projects, tickerMessages, urgentConcerns, settings } = body;

    const data = await prisma.scheduleData.upsert({
      where: { id: 'main' },
      update: {
        events: JSON.stringify(events || []),
        personnel: JSON.stringify(personnelStatuses || []),
        projects: JSON.stringify(projects || []),
        tickerMessages: JSON.stringify(tickerMessages || []),
        urgentConcerns: JSON.stringify(urgentConcerns || []),
        settings: JSON.stringify(settings || {}),
      },
      create: {
        id: 'main',
        events: JSON.stringify(events || []),
        personnel: JSON.stringify(personnelStatuses || []),
        projects: JSON.stringify(projects || []),
        tickerMessages: JSON.stringify(tickerMessages || []),
        urgentConcerns: JSON.stringify(urgentConcerns || []),
        settings: JSON.stringify(settings || {}),
      },
    });

    return NextResponse.json({
      events: safeJsonParse(data.events, []),
      personnelStatuses: safeJsonParse(data.personnel, []),
      projects: safeJsonParse(data.projects, []),
      tickerMessages: safeJsonParse(data.tickerMessages, []),
      urgentConcerns: safeJsonParse(data.urgentConcerns, []),
      settings: safeJsonParse(data.settings, {}),
    });
  } catch (error) {
    console.error('Error saving schedule data:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
