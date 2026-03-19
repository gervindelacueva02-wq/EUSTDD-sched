import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Fetch a single ticker message
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tickerMessage = await prisma.tickerMessage.findUnique({
      where: { id },
    });

    if (!tickerMessage) {
      return NextResponse.json({ error: 'Ticker message not found' }, { status: 404 });
    }

    return NextResponse.json({
      tickerMessage: {
        id: tickerMessage.id,
        message: tickerMessage.message,
        createdAt: tickerMessage.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching ticker message:', error);
    return NextResponse.json({ error: 'Failed to fetch ticker message' }, { status: 500 });
  }
}

// PUT - Update a ticker message
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { message } = body;

    const tickerMessage = await prisma.tickerMessage.update({
      where: { id },
      data: { message },
    });

    return NextResponse.json({
      tickerMessage: {
        id: tickerMessage.id,
        message: tickerMessage.message,
        createdAt: tickerMessage.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error updating ticker message:', error);
    return NextResponse.json({ error: 'Failed to update ticker message' }, { status: 500 });
  }
}

// DELETE - Hard delete a ticker message
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Hard delete - permanently removes from database
    await prisma.tickerMessage.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Ticker message deleted permanently' });
  } catch (error) {
    console.error('Error deleting ticker message:', error);
    return NextResponse.json({ error: 'Failed to delete ticker message' }, { status: 500 });
  }
}
