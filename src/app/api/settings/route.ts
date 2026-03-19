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

// GET - Fetch settings
export async function GET() {
  try {
    let settingsData = await prisma.appSettings.findUnique({
      where: { id: 'main' },
    });

    // Create default settings if not exists
    if (!settingsData) {
      settingsData = await prisma.appSettings.create({
        data: {
          id: 'main',
          settings: JSON.stringify(defaultSettings),
        },
      });
    }

    return NextResponse.json({
      settings: safeJsonParse(settingsData.settings, defaultSettings),
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// PUT - Update settings
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    const settingsData = await prisma.appSettings.upsert({
      where: { id: 'main' },
      update: {
        settings: JSON.stringify(body),
      },
      create: {
        id: 'main',
        settings: JSON.stringify(body),
      },
    });

    return NextResponse.json({
      settings: safeJsonParse(settingsData.settings, defaultSettings),
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
