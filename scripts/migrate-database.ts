/**
 * Database Migration Script
 * 
 * This script helps you migrate data from your OLD database (Render) 
 * to your NEW database (Neon).
 * 
 * Usage:
 * 1. Set OLD_DATABASE_URL in your .env file (your Render database URL)
 * 2. Set DATABASE_URL in your .env file (your new Neon database URL)
 * 3. Run: npx tsx scripts/migrate-database.ts
 */

import { PrismaClient } from '@prisma/client';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function migrateData() {
  log('\n========================================', 'cyan');
  log('  DATABASE MIGRATION SCRIPT', 'cyan');
  log('  Render → Neon', 'cyan');
  log('========================================\n', 'cyan');

  // Check for environment variables
  const oldDbUrl = process.env.OLD_DATABASE_URL;
  const newDbUrl = process.env.DATABASE_URL;

  if (!oldDbUrl) {
    log('❌ Error: OLD_DATABASE_URL not found in .env', 'red');
    log('Please add your OLD Render database URL to .env:', 'yellow');
    log('OLD_DATABASE_URL="postgresql://..."', 'yellow');
    process.exit(1);
  }

  if (!newDbUrl) {
    log('❌ Error: DATABASE_URL not found in .env', 'red');
    log('Please add your NEW Neon database URL to .env:', 'yellow');
    log('DATABASE_URL="postgresql://..."', 'yellow');
    process.exit(1);
  }

  log('📌 OLD_DATABASE_URL: ' + oldDbUrl.substring(0, 30) + '...', 'blue');
  log('📌 NEW_DATABASE_URL: ' + newDbUrl.substring(0, 30) + '...\n', 'blue');

  // Create Prisma clients
  log('Connecting to OLD database (Render)...', 'yellow');
  const oldPrisma = new PrismaClient({
    datasources: {
      db: {
        url: oldDbUrl,
      },
    },
  });

  try {
    // Test old connection
    await oldPrisma.$connect();
    log('✅ Connected to OLD database\n', 'green');
  } catch (error) {
    log('❌ Failed to connect to OLD database', 'red');
    log('Make sure OLD_DATABASE_URL is correct and the database is still active.', 'yellow');
    process.exit(1);
  }

  // Fetch data from old database
  log('📦 Fetching data from OLD database...', 'yellow');
  let oldData;
  try {
    oldData = await oldPrisma.scheduleData.findUnique({
      where: { id: 'main' },
    });
    
    if (!oldData) {
      log('⚠️  No data found in OLD database. It might be empty.', 'yellow');
      await oldPrisma.$disconnect();
      process.exit(0);
    }
    
    log('✅ Data found:', 'green');
    log(`   - Events: ${JSON.parse(oldData.events).length} items`, 'green');
    log(`   - Personnel: ${JSON.parse(oldData.personnel).length} items`, 'green');
    log(`   - Projects: ${JSON.parse(oldData.projects).length} items`, 'green');
    log(`   - Ticker Messages: ${JSON.parse(oldData.tickerMessages).length} items`, 'green');
    log(`   - Urgent Concerns: ${JSON.parse(oldData.urgentConcerns).length} items\n`, 'green');
  } catch (error) {
    log('❌ Failed to fetch data from OLD database', 'red');
    console.error(error);
    await oldPrisma.$disconnect();
    process.exit(1);
  }

  // Disconnect from old database
  await oldPrisma.$disconnect();
  log('🔌 Disconnected from OLD database\n', 'blue');

  // Connect to new database
  log('Connecting to NEW database (Neon)...', 'yellow');
  const newPrisma = new PrismaClient();

  try {
    await newPrisma.$connect();
    log('✅ Connected to NEW database\n', 'green');
  } catch (error) {
    log('❌ Failed to connect to NEW database', 'red');
    log('Make sure DATABASE_URL is correct.', 'yellow');
    process.exit(1);
  }

  // Check if new database already has data
  log('🔍 Checking if NEW database already has data...', 'yellow');
  const existingData = await newPrisma.scheduleData.findUnique({
    where: { id: 'main' },
  });

  if (existingData) {
    log('⚠️  NEW database already has data!', 'yellow');
    log('Overwriting existing data...\n', 'yellow');
  }

  // Migrate data to new database
  log('📝 Migrating data to NEW database...', 'yellow');
  try {
    const migratedData = await newPrisma.scheduleData.upsert({
      where: { id: 'main' },
      update: {
        events: oldData.events,
        personnel: oldData.personnel,
        projects: oldData.projects,
        tickerMessages: oldData.tickerMessages,
        urgentConcerns: oldData.urgentConcerns,
        settings: oldData.settings,
      },
      create: {
        id: 'main',
        events: oldData.events,
        personnel: oldData.personnel,
        projects: oldData.projects,
        tickerMessages: oldData.tickerMessages,
        urgentConcerns: oldData.urgentConcerns,
        settings: oldData.settings,
      },
    });

    log('✅ Data migrated successfully!\n', 'green');
    log('📊 Migrated data:', 'green');
    log(`   - Events: ${JSON.parse(migratedData.events).length} items`, 'green');
    log(`   - Personnel: ${JSON.parse(migratedData.personnel).length} items`, 'green');
    log(`   - Projects: ${JSON.parse(migratedData.projects).length} items`, 'green');
    log(`   - Ticker Messages: ${JSON.parse(migratedData.tickerMessages).length} items`, 'green');
    log(`   - Urgent Concerns: ${JSON.parse(migratedData.urgentConcerns).length} items\n`, 'green');
  } catch (error) {
    log('❌ Failed to migrate data', 'red');
    console.error(error);
    await newPrisma.$disconnect();
    process.exit(1);
  }

  // Disconnect from new database
  await newPrisma.$disconnect();

  log('========================================', 'cyan');
  log('  ✅ MIGRATION COMPLETE!', 'green');
  log('========================================\n', 'cyan');
  log('Next steps:', 'blue');
  log('1. Update your Render environment variables with the new Neon URL', 'yellow');
  log('2. Redeploy your app on Render', 'yellow');
  log('3. Verify everything works', 'yellow');
  log('4. Delete the old Render database\n', 'yellow');
}

// Run the migration
migrateData().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
