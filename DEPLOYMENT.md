# Deploying EUSTDD Schedule to Render

## 🚨 Important: SQLite Limitations on Render

The current configuration uses **SQLite** which has limitations on cloud platforms like Render:

1. **Ephemeral Filesystem**: Render's filesystem is temporary - data is lost on each deployment
2. **No Persistence**: Without a persistent disk (paid feature), your database resets every time

## 🎯 Recommended Solution: Use PostgreSQL

Render provides **free PostgreSQL databases** that work reliably. Here's how to switch:

### Step 1: Update `prisma/schema.prisma`

Replace the schema with PostgreSQL-compatible version:

\`\`\`prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl  = env("DIRECT_DATABASE_URL")
}

model ScheduleData {
  id             String   @id @default("main")
  events         String   @default("[]")
  personnel      String   @default("[]")
  projects       String   @default("[]")
  tickerMessages String   @default("[]")
  settings       String   @default("{}")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@map("schedule_data")
}
\`\`\`

### Step 2: Update `package.json` scripts

\`\`\`json
{
  "scripts": {
    "dev": "next dev -p 3000 2>&1 | tee dev.log",
    "build": "prisma generate && next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/",
    "start": "NODE_ENV=production node .next/standalone/server.js",
    "lint": "eslint .",
    "db:push": "prisma db push",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:reset": "prisma migrate reset",
    "postinstall": "prisma generate"
  }
}
\`\`\`

### Step 3: Create Render Blueprint (`render.yaml`)

\`\`\`yaml
services:
  - type: web
    name: eustdd-schedule
    env: node
    region: oregon
    plan: free
    buildCommand: npm install && npx prisma generate && npm run build
    startCommand: npx prisma db push && npm run start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: eustdd-db
          property: connectionString
      - key: DIRECT_DATABASE_URL
        fromDatabase:
          name: eustdd-db
          property: connectionString

databases:
  - name: eustdd-db
    region: oregon
    plan: free
    user: eustdd_user
\`\`\`

### Step 4: Deploy on Render

1. **Create a Render Account**: Go to [render.com](https://render.com) and sign up

2. **Create a New Blueprint Instance**:
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Select the repository: `gervindelacueva02-wq/EUSTDD-sched`
   - Render will automatically detect the `render.yaml` file

3. **Apply the Configuration**:
   - Review the resources (1 Web Service + 1 Database)
   - Click "Apply"

4. **Wait for Deployment**:
   - Render will create your PostgreSQL database
   - Build your application
   - Deploy and start the service

### Step 5: Access Your Application

Once deployed, your app will be available at:
\`\`\`
https://your-app-name.onrender.com
\`\`\`

## 🔧 Manual Deployment (Alternative)

If you prefer manual setup:

### 1. Create PostgreSQL Database
- In Render Dashboard → New → PostgreSQL
- Note the **Internal Database URL** (for DATABASE_URL)
- Note the **External Database URL** (for DIRECT_DATABASE_URL)

### 2. Create Web Service
- In Render Dashboard → New → Web Service
- Connect your GitHub repo
- Set the following:
  - **Build Command**: `npm install && npx prisma generate && npm run build`
  - **Start Command**: `npx prisma db push && npm run start`
  - **Environment Variables**:
    - `DATABASE_URL` = Your Internal Database URL
    - `DIRECT_DATABASE_URL` = Your External Database URL

## 📝 Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection (pooled) | `postgresql://user:pass@host/db?pgbouncer=true` |
| `DIRECT_DATABASE_URL` | PostgreSQL connection (direct) | `postgresql://user:pass@host/db` |

## ⚠️ Troubleshooting

### Build Fails with Prisma Error
Make sure you have:
1. `postinstall` script in package.json: `"postinstall": "prisma generate"`
2. Prisma client is generated in build: `"build": "prisma generate && next build..."`

### Database Connection Issues
1. Verify DATABASE_URL format matches PostgreSQL format
2. Ensure both DATABASE_URL and DIRECT_DATABASE_URL are set
3. Check that the database is in the same region as your web service

### Application Works But Data Doesn't Persist
This indicates SQLite is still being used. Ensure:
1. `prisma/schema.prisma` has `provider = "postgresql"`
2. Environment variables are correctly set
3. Run `npx prisma db push` on startup

## 🎉 Success!

Your EUSTDD Schedule application is now deployed with persistent PostgreSQL storage!
