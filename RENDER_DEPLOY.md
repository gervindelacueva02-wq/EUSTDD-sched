# EUSTDD Schedule - Render Deployment Files

## Quick Start

1. Copy these files to your GitHub repo
2. Create a PostgreSQL database on Render
3. Set DATABASE_URL environment variable
4. Deploy!

## Required Files

- `package.json` - Dependencies and scripts
- `next.config.ts` - Next.js configuration
- `prisma/schema.prisma` - Database schema (PostgreSQL)
- `render.yaml` - Render deployment config

## Environment Variables

| Key | Value |
|-----|-------|
| DATABASE_URL | Your PostgreSQL connection string |
| NODE_VERSION | 20 |

## Commands

```bash
# Local development
npm install
npm run db:push
npm run dev

# Production build
npm run build
npm run start
```
