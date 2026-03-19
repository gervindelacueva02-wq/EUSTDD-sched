import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Fetch all projects
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Transform to match the frontend interface
    const transformedProjects = projects.map(p => ({
      id: p.id,
      name: p.name,
      number: p.number,
      createdAt: p.createdAt.toISOString(),
    }));

    return NextResponse.json({ projects: transformedProjects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST - Create a new project
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, number } = body;

    const project = await prisma.project.create({
      data: {
        name,
        number: number || 0,
      },
    });

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        number: project.number,
        createdAt: project.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
