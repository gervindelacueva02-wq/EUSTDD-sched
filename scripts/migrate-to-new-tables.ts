import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration to new tables...');

  // Get the legacy data
  const legacyData = await prisma.scheduleData.findUnique({
    where: { id: 'main' },
  });

  if (!legacyData) {
    console.log('No legacy data found. Nothing to migrate.');
    return;
  }

  console.log('Found legacy data. Migrating...');

  // Parse JSON data
  const events = JSON.parse(legacyData.events || '[]');
  const personnel = JSON.parse(legacyData.personnel || '[]');
  const projects = JSON.parse(legacyData.projects || '[]');
  const tickerMessages = JSON.parse(legacyData.tickerMessages || '[]');
  const urgentConcerns = JSON.parse(legacyData.urgentConcerns || '[]');
  const settings = JSON.parse(legacyData.settings || '{}');

  // Migrate Events
  if (events.length > 0) {
    console.log(`Migrating ${events.length} events...`);
    for (const event of events) {
      try {
        await prisma.event.create({
          data: {
            id: event.id,
            title: event.title,
            dateStarted: new Date(event.dateStarted),
            timeStart: event.timeStart,
            timeEnd: event.timeEnd,
            details: event.details || null,
            categories: JSON.stringify(event.categories || event.category ? [event.category] : []),
            createdAt: event.createdAt ? new Date(event.createdAt) : new Date(),
          },
        });
      } catch (e) {
        console.log(`Event ${event.id} already exists or error:`, e);
      }
    }
  }

  // Migrate Personnel
  if (personnel.length > 0) {
    console.log(`Migrating ${personnel.length} personnel...`);
    for (const p of personnel) {
      try {
        await prisma.personnel.create({
          data: {
            id: p.id,
            name: p.name,
            type: p.type,
            dateStart: new Date(p.dateStart),
            dateEnd: new Date(p.dateEnd),
            location: p.location || null,
            createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
          },
        });
      } catch (e) {
        console.log(`Personnel ${p.id} already exists or error:`, e);
      }
    }
  }

  // Migrate Projects
  if (projects.length > 0) {
    console.log(`Migrating ${projects.length} projects...`);
    for (const project of projects) {
      try {
        await prisma.project.create({
          data: {
            id: project.id,
            name: project.name,
            number: project.number || 0,
            createdAt: project.createdAt ? new Date(project.createdAt) : new Date(),
          },
        });
      } catch (e) {
        console.log(`Project ${project.id} already exists or error:`, e);
      }
    }
  }

  // Migrate TickerMessages
  if (tickerMessages.length > 0) {
    console.log(`Migrating ${tickerMessages.length} ticker messages...`);
    for (const msg of tickerMessages) {
      try {
        await prisma.tickerMessage.create({
          data: {
            id: msg.id,
            message: msg.message,
            createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
          },
        });
      } catch (e) {
        console.log(`TickerMessage ${msg.id} already exists or error:`, e);
      }
    }
  }

  // Migrate UrgentConcerns
  if (urgentConcerns.length > 0) {
    console.log(`Migrating ${urgentConcerns.length} urgent concerns...`);
    for (const concern of urgentConcerns) {
      try {
        await prisma.urgentConcern.create({
          data: {
            id: concern.id,
            title: concern.title,
            description: concern.description || null,
            createdAt: concern.createdAt ? new Date(concern.createdAt) : new Date(),
          },
        });
      } catch (e) {
        console.log(`UrgentConcern ${concern.id} already exists or error:`, e);
      }
    }
  }

  // Migrate Settings
  try {
    await prisma.appSettings.create({
      data: {
        id: 'main',
        settings: JSON.stringify(settings),
      },
    });
    console.log('Settings migrated.');
  } catch (e) {
    console.log('Settings already exist, updating...');
    await prisma.appSettings.update({
      where: { id: 'main' },
      data: { settings: JSON.stringify(settings) },
    });
  }

  console.log('Migration completed successfully!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
