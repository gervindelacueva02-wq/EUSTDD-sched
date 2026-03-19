import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Fetch all personnel or filter by type
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const where = type ? { type } : {};
    
    const personnel = await prisma.personnel.findMany({
      where,
      orderBy: [{ dateStart: 'asc' }, { createdAt: 'desc' }],
    });

    // Transform to match the frontend interface
    const transformedPersonnel = personnel.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
      dateStart: p.dateStart.toISOString(),
      dateEnd: p.dateEnd.toISOString(),
      location: p.location || undefined,
      createdAt: p.createdAt.toISOString(),
    }));

    return NextResponse.json({ personnel: transformedPersonnel });
  } catch (error) {
    console.error('Error fetching personnel:', error);
    return NextResponse.json({ error: 'Failed to fetch personnel' }, { status: 500 });
  }
}

// POST - Create a new personnel entry
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, dateStart, dateEnd, location } = body;

    const personnel = await prisma.personnel.create({
      data: {
        name,
        type,
        dateStart: new Date(dateStart),
        dateEnd: new Date(dateEnd),
        location: location || null,
      },
    });

    return NextResponse.json({
      personnel: {
        id: personnel.id,
        name: personnel.name,
        type: personnel.type,
        dateStart: personnel.dateStart.toISOString(),
        dateEnd: personnel.dateEnd.toISOString(),
        location: personnel.location || undefined,
        createdAt: personnel.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating personnel:', error);
    return NextResponse.json({ error: 'Failed to create personnel' }, { status: 500 });
  }
}
