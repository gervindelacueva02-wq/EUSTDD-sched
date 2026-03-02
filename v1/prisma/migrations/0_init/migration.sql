-- CreateTable
CREATE TABLE "ScheduleData" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "events" TEXT NOT NULL DEFAULT '[]',
    "personnel" TEXT NOT NULL DEFAULT '[]',
    "projects" TEXT NOT NULL DEFAULT '[]',
    "settings" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleData_pkey" PRIMARY KEY ("id")
);
