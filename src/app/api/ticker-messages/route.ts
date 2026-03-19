import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Fetch all ticker messages
export async function GET() {
  try {
    const tickerMessages = await prisma.tickerMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Transform to match the frontend interface
    const transformedMessages = tickerMessages.map(m => ({
      id: m.id,
      message: m.message,
      createdAt: m.createdAt.toISOString(),
    }));

    return NextResponse.json({ tickerMessages: transformedMessages });
  } catch (error) {
    console.error('Error fetching ticker messages:', error);
    return NextResponse.json({ error: 'Failed to fetch ticker messages' }, { status: 500 });
  }
}

// POST - Create a new ticker message
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message } = body;

    const tickerMessage = await prisma.tickerMessage.create({
      data: {
        message,
      },
    });

    return NextResponse.json({
      tickerMessage: {
        id: tickerMessage.id,
        message: tickerMessage.message,
        createdAt: tickerMessage.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating ticker message:', error);
    return NextResponse.json({ error: 'Failed to create ticker message' }, { status: 500 });
  }
}
