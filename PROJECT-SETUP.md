# EUSTDD Schedule - Project Setup Guide

A modern, production-ready schedule management application for tracking events, personnel status (CTO/LEAVE, WFH, In Travel), projects, and announcements.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Project Structure](#project-structure)
3. [Prerequisites](#prerequisites)
4. [Installation Steps](#installation-steps)
5. [Running the Project](#running-the-project)
6. [Key Files and Their Purposes](#key-files-and-their-purposes)
7. [Environment Setup](#environment-setup)
8. [VS Code Setup Recommendations](#vs-code-setup-recommendations)
9. [Troubleshooting](#troubleshooting)

---

## Project Overview

**EUSTDD Schedule** is a team schedule management dashboard built with:

- **Next.js 16** - React framework with App Router
- **TypeScript 5** - Type-safe JavaScript
- **Tailwind CSS 4** - Utility-first CSS framework
- **shadcn/ui** - Beautiful, accessible UI components
- **Prisma** - Next-generation ORM with SQLite database
- **Zustand** - Simple state management
- **Framer Motion** - Smooth animations and transitions

### Key Features

- **Events Management**: Create, edit, and delete schedule events with time tracking
- **Personnel Status Tracking**: Monitor CTO/LEAVE, WFH, and In Travel status
- **Project Counter**: Track project requests with increment/decrement counters
- **Ticker Messages**: Scrolling announcement ticker
- **PIN Protection**: Optional PIN lock for administrative actions
- **Multiple View Modes**: Day, Week, and Month views
- **Transition Animations**: Various transition styles (fade, slide, auto-scroll)
- **Responsive Design**: Mobile-first design with desktop optimizations
- **Real-time Sync**: Auto-sync data across multiple clients (3-second polling)

---

## Project Structure

```
my-project/
├── db/
│   └── custom.db              # SQLite database file
├── prisma/
│   └── schema.prisma          # Database schema definition
├── public/
│   ├── old-logo.svg           # Legacy logo asset
│   └── robots.txt             # SEO robots configuration
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── route.ts       # Base API endpoint
│   │   │   └── schedule/
│   │   │       └── route.ts   # Schedule CRUD API
│   │   ├── globals.css        # Global styles & CSS variables
│   │   ├── layout.tsx         # Root layout component
│   │   └── page.tsx           # Main application page
│   ├── components/
│   │   └── ui/                # shadcn/ui components (50+ components)
│   │       ├── button.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── select.tsx
│   │       └── ... (many more)
│   ├── hooks/
│   │   ├── use-mobile.ts      # Mobile detection hook
│   │   └── use-toast.ts       # Toast notification hook
│   ├── lib/
│   │   ├── db.ts              # Prisma client instance
│   │   └── utils.ts           # Utility functions (cn, etc.)
│   ├── store/
│   │   └── schedule-store.ts  # Zustand store for state management
│   └── types/
│       └── schedule.ts        # TypeScript type definitions
├── bun.lock                   # Bun lockfile
├── components.json            # shadcn/ui configuration
├── eslint.config.mjs          # ESLint configuration
├── next.config.ts             # Next.js configuration
├── package.json               # Dependencies and scripts
├── postcss.config.mjs         # PostCSS configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
└── Caddyfile                  # Caddy reverse proxy config (optional)
```

---

## Prerequisites

Before you begin, ensure you have the following installed:

### Required

| Software | Version | Download |
|----------|---------|----------|
| **Node.js** | v18.0.0 or higher | [nodejs.org](https://nodejs.org/) |
| **Bun** | v1.0.0 or higher | [bun.sh](https://bun.sh/) |
| **VS Code** | Latest | [code.visualstudio.com](https://code.visualstudio.com/) |

### Recommended VS Code Extensions

| Extension | Purpose |
|-----------|---------|
| **ESLint** | JavaScript/TypeScript linting |
| **Tailwind CSS IntelliSense** | Tailwind class autocomplete |
| **Prettier** | Code formatting |
| **Prisma** | Prisma schema support |
| **TypeScript Importer** | Auto import TypeScript modules |

### Installing Bun

If you don't have Bun installed:

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"

# Or using npm
npm install -g bun
```

After installation, restart your terminal and verify:

```bash
bun --version
```

---

## Installation Steps

### Step 1: Clone or Copy the Project

```bash
# If cloning from a repository
git clone <repository-url>
cd my-project

# Or if you have the project files, navigate to the project directory
cd my-project
```

### Step 2: Install Dependencies

```bash
# Install all dependencies using Bun
bun install
```

This will install all dependencies defined in `package.json`, including:
- Next.js framework
- React and React DOM
- Tailwind CSS and plugins
- shadcn/ui components (Radix UI primitives)
- Prisma client
- Zustand state management
- Framer Motion for animations
- And more...

### Step 3: Initialize the Database

```bash
# Generate Prisma client
bun run db:generate

# Push database schema (creates SQLite database)
bun run db:push
```

This will:
1. Generate the Prisma client based on `prisma/schema.prisma`
2. Create the SQLite database file at `db/custom.db`
3. Create the `ScheduleData` table

### Step 4: Verify Installation

```bash
# Check that all dependencies are installed
bun run lint
```

---

## Running the Project

### Development Mode

```bash
# Start the development server on port 3000
bun run dev
```

The application will be available at **http://localhost:3000**

Features in development mode:
- Hot module replacement (HMR)
- Detailed error messages
- Development logging (Prisma queries)
- Source maps for debugging

### Production Mode

```bash
# Build the application for production
bun run build

# Start the production server
bun run start
```

The production build:
- Optimized bundle size
- Standalone output for deployment
- No development logging
- Performance optimizations enabled

### Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server on port 3000 |
| `bun run build` | Build for production (with standalone output) |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint to check code quality |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:push` | Push schema changes to database |
| `bun run db:migrate` | Create and apply database migration |
| `bun run db:reset` | Reset database and apply migrations |

---

## Key Files and Their Purposes

### Core Application Files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Main application component with all schedule management logic |
| `src/app/layout.tsx` | Root layout with fonts and global providers |
| `src/app/globals.css` | Global CSS variables, Tailwind imports, custom animations |

### State Management

| File | Purpose |
|------|---------|
| `src/store/schedule-store.ts` | Zustand store for events, personnel, projects, settings |
| `src/types/schedule.ts` | TypeScript interfaces for all data types |

### Database

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema (SQLite with ScheduleData model) |
| `src/lib/db.ts` | Prisma client singleton instance |
| `db/custom.db` | SQLite database file (auto-generated) |

### API Routes

| File | Purpose |
|------|---------|
| `src/app/api/schedule/route.ts` | GET/POST endpoints for schedule data CRUD |

### Configuration Files

| File | Purpose |
|------|---------|
| `next.config.ts` | Next.js configuration (standalone output, React settings) |
| `tsconfig.json` | TypeScript configuration (paths, strict mode) |
| `tailwind.config.ts` | Tailwind CSS theme and plugin configuration |
| `postcss.config.mjs` | PostCSS plugins for Tailwind |
| `components.json` | shadcn/ui component library configuration |
| `eslint.config.mjs` | ESLint rules and settings |

### UI Components

The `src/components/ui/` directory contains 50+ shadcn/ui components including:

- **Forms**: Button, Input, Select, Checkbox, Switch, Textarea, Label
- **Layout**: Card, Separator, Tabs, Accordion, Resizable
- **Feedback**: Dialog, Sheet, Toast, Alert, Progress, Skeleton
- **Navigation**: Dropdown Menu, Navigation Menu, Breadcrumb
- **Data**: Table, Chart, Calendar, Badge

---

## Environment Setup

### Environment Variables (Optional)

This project uses SQLite and doesn't require environment variables for basic setup. However, you can create a `.env` file for customization:

```env
# Optional: Custom database URL (default: file:../db/custom.db)
DATABASE_URL="file:../db/custom.db"

# Optional: Node environment
NODE_ENV="development"
```

### Database Configuration

The database is configured in `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:../db/custom.db"
}
```

### Next.js Configuration

The `next.config.ts` is configured for:
- Standalone output (for containerized deployments)
- TypeScript build error handling
- React strict mode disabled

---

## VS Code Setup Recommendations

### Recommended Settings (`.vscode/settings.json`)

Create a `.vscode` folder in your project root with these settings:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

### Recommended Extensions (`.vscode/extensions.json`)

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "prisma.prisma",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### Debug Configuration (`.vscode/launch.json`)

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug full stack",
      "type": "node-terminal",
      "request": "launch",
      "command": "bun run dev"
    },
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "bun run dev"
    }
  ]
}
```

---

## Troubleshooting

### Common Issues

#### 1. Port 3000 Already in Use

```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process or use a different port
bun run dev -- -p 3001
```

#### 2. Database Errors

```bash
# Reset the database completely
bun run db:reset

# Or manually delete and recreate
rm db/custom.db
bun run db:push
```

#### 3. Module Not Found Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules bun.lock
bun install
```

#### 4. Prisma Client Not Generated

```bash
# Regenerate Prisma client
bun run db:generate
```

#### 5. Build Errors

```bash
# Clear Next.js cache
rm -rf .next
bun run build
```

#### 6. TypeScript Errors

The project is configured with `typescript.ignoreBuildErrors: true` in `next.config.ts` for development convenience. For strict type checking:

```bash
# Run TypeScript check
npx tsc --noEmit
```

---

## Quick Start Summary

```bash
# 1. Navigate to project
cd my-project

# 2. Install dependencies
bun install

# 3. Setup database
bun run db:generate
bun run db:push

# 4. Start development server
bun run dev

# 5. Open in browser
# http://localhost:3000
```

---

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Bun Documentation](https://bun.sh/docs)

---

## Support

For issues or questions about this project, please:
1. Check the troubleshooting section above
2. Review the key files and their purposes
3. Consult the official documentation links provided

---

*Built with modern web technologies. Designed for team schedule management.*
