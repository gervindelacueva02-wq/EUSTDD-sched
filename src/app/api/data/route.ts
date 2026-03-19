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

// Default settings
const defaultSettings = {
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
};

// GET - Fetch all data from tables
export async function GET() {
  try {
    // Fetch all data in parallel
    const [events, personnel, projects, tickerMessages, urgentConcerns, settingsData] = await Promise.all([
      prisma.event.findMany({ orderBy: { dateStarted: 'asc' } }),
      prisma.personnel.findMany({ orderBy: [{ dateStart: 'asc' }, { createdAt: 'desc' }] }),
      prisma.project.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.tickerMessage.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.urgentConcern.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.appSettings.findUnique({ where: { id: 'main' } }),
    ]);

    // Transform to match the frontend interface
    const transformedEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      dateStarted: event.dateStarted.toISOString(),
      timeStart: event.timeStart,
      timeEnd: event.timeEnd,
      details: event.details || undefined,
      categories: safeJsonParse(event.categories, []),
      createdAt: event.createdAt.toISOString(),
    }));

    const transformedPersonnel = personnel.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
      dateStart: p.dateStart.toISOString(),
      dateEnd: p.dateEnd.toISOString(),
      location: p.location || undefined,
      createdAt: p.createdAt.toISOString(),
    }));

    const transformedProjects = projects.map(p => ({
      id: p.id,
      name: p.name,
      number: p.number,
      createdAt: p.createdAt.toISOString(),
    }));

    const transformedTickerMessages = tickerMessages.map(m => ({
      id: m.id,
      message: m.message,
      createdAt: m.createdAt.toISOString(),
    }));

    const transformedUrgentConcerns = urgentConcerns.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description || undefined,
      createdAt: c.createdAt.toISOString(),
    }));

    // Get or create settings
    let settings = defaultSettings;
    if (settingsData) {
      settings = safeJsonParse(settingsData.settings, defaultSettings);
    }

    return NextResponse.json({
      events: transformedEvents,
      personnelStatuses: transformedPersonnel,
      projects: transformedProjects,
      tickerMessages: transformedTickerMessages,
      urgentConcerns: transformedUrgentConcerns,
      settings,
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
