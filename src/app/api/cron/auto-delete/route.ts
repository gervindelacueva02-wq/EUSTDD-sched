import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { subDays } from 'date-fns';

// Cron job endpoint for auto-deleting old records
// This should be called daily by a cron service (e.g., Vercel Cron, external cron job)

export async function GET(request: Request) {
  try {
    // Verify cron secret for security (optional but recommended)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Skip auth in development or if no secret is configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const sixtyDaysAgo = subDays(now, 60);
    
    const deletedRecords: { table: string; count: number }[] = [];

    // 1. Delete old Events (schedules) - 60 days after event date
    // Keep all future schedules
    const deletedEvents = await prisma.event.deleteMany({
      where: {
        dateStarted: {
          lt: sixtyDaysAgo,
        },
      },
    });
    
    // Log the deletions
    if (deletedEvents.count > 0) {
      deletedRecords.push({ table: 'Event', count: deletedEvents.count });
    }

    // 2. Delete old CTO/FL/WFH personnel - 60 days after end date
    const deletedCtoWfh = await prisma.personnel.deleteMany({
      where: {
        type: { in: ['CTO', 'FL', 'WFH'] },
        dateEnd: {
          lt: sixtyDaysAgo,
        },
      },
    });
    
    if (deletedCtoWfh.count > 0) {
      deletedRecords.push({ table: 'Personnel (CTO/FL/WFH)', count: deletedCtoWfh.count });
    }

    // 3. Delete old TRAVEL personnel - 60 days after end date
    const deletedTravel = await prisma.personnel.deleteMany({
      where: {
        type: 'TRAVEL',
        dateEnd: {
          lt: sixtyDaysAgo,
        },
      },
    });
    
    if (deletedTravel.count > 0) {
      deletedRecords.push({ table: 'Personnel (TRAVEL)', count: deletedTravel.count });
    }

    // Note: OTHER type personnel (Other Division Requests) are NOT auto-deleted
    // They can only be deleted manually via UI

    // Log the auto-delete operation
    console.log(`[Auto-Delete] ${new Date().toISOString()}: Deleted ${deletedRecords.reduce((sum, r) => sum + r.count, 0)} records`);
    console.log('[Auto-Delete] Details:', deletedRecords);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      deletedRecords,
      totalDeleted: deletedRecords.reduce((sum, r) => sum + r.count, 0),
      message: `Auto-delete completed. ${deletedRecords.length > 0 ? `Deleted ${deletedRecords.map(r => `${r.count} from ${r.table}`).join(', ')}` : 'No records to delete.'}`,
    });
  } catch (error) {
    console.error('[Auto-Delete] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Also support POST for manual triggering
export async function POST(request: Request) {
  return GET(request);
}
