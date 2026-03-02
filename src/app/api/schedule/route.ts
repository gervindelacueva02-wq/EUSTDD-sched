import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch all schedule data
export async function GET() {
  try {
    let data = await db.scheduleData.findUnique({
      where: { id: 'main' },
    });

    // Create default data if not exists
    if (!data) {
      data = await db.scheduleData.create({
        data: {
          id: 'main',
          events: '[]',
          personnel: '[]',
          projects: '[]',
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
      events: JSON.parse(data.events),
      personnelStatuses: JSON.parse(data.personnel),
      projects: JSON.parse(data.projects),
      settings: JSON.parse(data.settings),
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
    const { events, personnelStatuses, projects, settings } = body;

    const data = await db.scheduleData.upsert({
      where: { id: 'main' },
      update: {
        events: JSON.stringify(events || []),
        personnel: JSON.stringify(personnelStatuses || []),
        projects: JSON.stringify(projects || []),
        settings: JSON.stringify(settings || {}),
      },
      create: {
        id: 'main',
        events: JSON.stringify(events || []),
        personnel: JSON.stringify(personnelStatuses || []),
        projects: JSON.stringify(projects || []),
        settings: JSON.stringify(settings || {}),
      },
    });

    return NextResponse.json({
      events: JSON.parse(data.events),
      personnelStatuses: JSON.parse(data.personnel),
      projects: JSON.parse(data.projects),
      settings: JSON.parse(data.settings),
    });
  } catch (error) {
    console.error('Error saving schedule data:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
