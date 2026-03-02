# EUSTDD Schedule

A modern schedule management system for tracking events, personnel status (CTO/FL/WFH/Travel), and project requests. Built with Next.js 16, TypeScript, Tailwind CSS, and Prisma.

![EUSTDD Schedule](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=for-the-badge&logo=tailwind-css)

## ✨ Features

- **📅 Schedule Management** - Day, Week, and Month views for events
- **👥 Personnel Tracking** - Monitor CTO/FL, WFH, and In Travel status
- **📊 Project Requests** - Track and manage project request counters
- **🔐 PIN Protection** - Optional 4-digit PIN for settings and adding entries
- **🎨 Transition Effects** - Multiple animation styles (fade, slide, auto-scroll)
- **🔔 Notifications** - 5-minute alerts for upcoming events
- **📱 Responsive Design** - Works on desktop and mobile devices
- **🌙 Theme Support** - Light and dark mode ready

## 🛠️ Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: PostgreSQL (Prisma ORM)
- **State**: Zustand
- **Animations**: Framer Motion

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or Bun
- PostgreSQL database (local or cloud)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd eustdd-schedule
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment variables**
   
   Create a `.env` file:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/eustdd_schedule?schema=public"
   DIRECT_DATABASE_URL="postgresql://user:password@localhost:5432/eustdd_schedule?schema=public"
   ```

4. **Initialize the database**
   ```bash
   bun run db:push
   ```

5. **Start development server**
   ```bash
   bun run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 🚢 Deploy to Render

### Option 1: One-Click Deploy with Blueprint

1. **Push to GitHub** - Push your code to a GitHub repository

2. **Create Render Account** - Sign up at [render.com](https://render.com)

3. **Create New Blueprint**
   - Go to Dashboard → New → Blueprint
   - Connect your GitHub repository
   - Render will detect the `render.yaml` file
   - Click "Apply"

4. **Wait for Deployment** - Render will:
   - Create a free PostgreSQL database
   - Build and deploy your application
   - Provide a URL like `https://eustdd-schedule.onrender.com`

### Option 2: Manual Setup

1. **Create PostgreSQL Database**
   - Go to Render Dashboard → New → PostgreSQL
   - Note the Internal Database URL

2. **Create Web Service**
   - Go to Render Dashboard → New → Web Service
   - Connect your GitHub repository
   - Configure:
     - **Name**: eustdd-schedule
     - **Runtime**: Node
     - **Build Command**: `bun install && bun run db:generate && bun run db:migrate:deploy && bun run build`
     - **Start Command**: `bun run start`

3. **Add Environment Variables**
   - `DATABASE_URL`: From your PostgreSQL database
   - `DIRECT_DATABASE_URL`: Same as DATABASE_URL
   - `NODE_ENV`: production

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── schedule/route.ts    # API endpoints
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Main application
│   └── globals.css              # Global styles
├── components/
│   └── ui/                      # shadcn/ui components
├── hooks/                       # Custom React hooks
├── lib/
│   ├── db.ts                    # Prisma client
│   └── utils.ts                 # Utility functions
├── store/
│   └── schedule-store.ts        # Zustand store
└── types/
    └── schedule.ts              # TypeScript types
prisma/
└── schema.prisma                # Database schema
```

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server |
| `bun run build` | Build for production |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push schema to database |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Create and run migrations |
| `bun run db:migrate:deploy` | Deploy migrations (production) |

## 🔐 PIN Protection

The system supports optional PIN protection:
1. Go to Settings (gear icon)
2. Enable PIN Protection
3. Enter a 4-digit PIN
4. Save settings

The PIN will be required for:
- Accessing settings
- Adding new entries
- Editing existing entries

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

---

Built with ❤️ for EUSTDD
