# 📚 Database Migration Guide: Render → Neon

## 🎯 Overview

This guide will teach you how to move your data from Render's expiring PostgreSQL database to **Neon** (free, no expiry).

---

## 📊 Understanding Your Database

### What is a Database?

A database stores all your application data:
- **Events** (meetings, activities)
- **Personnel Status** (CTO, WFH, Travel)
- **Projects**
- **Ticker Messages**
- **Settings**

### Why Migrate?

| Render Database | Neon Database |
|----------------|---------------|
| ❌ Expires in 90 days | ✅ Never expires |
| ❌ Gets deleted after expiry | ✅ Free forever |
| ❌ Limited free tier | ✅ Better free tier |

---

## 🚀 Step-by-Step Migration

### STEP 1: Create Your Neon Database (5 minutes)

1. **Go to Neon**: https://neon.tech

2. **Sign Up** (use GitHub or Google for faster signup)
   - Click "Sign Up"
   - Choose "Continue with GitHub" or "Continue with Google"

3. **Create a Project**
   - Click "Create a project"
   - Name it: `eustdd-schedule`
   - Select region: `US East (Ohio)` or closest to you
   - Click "Create project"

4. **Copy Your Connection Strings**
   
   You'll see something like this:
   ```
   Connection string:
   postgresql://neondb_owner:AbCdEf123456@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

   **You need TWO strings:**
   
   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | The pooled connection (shown on dashboard) |
   | `DIRECT_DATABASE_URL` | Same URL but add `-direct` after `ep-xxx` |

   **Example:**
   ```
   DATABASE_URL=postgresql://neondb_owner:AbCdEf123456@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   
   DIRECT_DATABASE_URL=postgresql://neondb_owner:AbCdEf123456@ep-cool-darkness-123456-direct.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

---

### STEP 2: Backup Your Old Data from Render

#### Option A: Using Render Dashboard (Easiest)

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Find your database** (e.g., `eustdd-db`)
3. **Click on it**
4. **Look for "Export" or "Backup" button**
5. **Download the SQL dump**

#### Option B: Using pg_dump (Command Line)

If you have your old database URL:

```bash
# Replace with your OLD Render database URL
pg_dump "postgresql://user:password@dpg-xxx.render.com/dbname" > backup.sql
```

#### Option C: Export via Prisma Studio

```bash
# Set your OLD Render database URL in .env temporarily
# Then run:
npx prisma studio
```

This opens a visual editor where you can:
1. View all your data
2. Export to JSON/CSV manually

---

### STEP 3: Update Your Environment Variables

#### For Local Development:

1. **Open your `.env` file**

2. **Replace with your NEW Neon URLs:**
   ```env
   DATABASE_URL="postgresql://neondb_owner:AbCdEf123456@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
   DIRECT_DATABASE_URL="postgresql://neondb_owner:AbCdEf123456@ep-cool-darkness-123456-direct.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```

3. **Run these commands:**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Push schema to new database
   npx prisma db push
   ```

#### For Render Deployment:

1. **Go to Render Dashboard**
2. **Select your web service** (`eustdd-schedule`)
3. **Go to "Environment" tab**
4. **Add/Update these variables:**

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | Your Neon pooled connection |
   | `DIRECT_DATABASE_URL` | Your Neon direct connection |

5. **Click "Save Changes"** (this will redeploy)

---

### STEP 4: Import Your Data to Neon

#### Option A: Using Neon SQL Editor

1. **Go to Neon Dashboard**
2. **Click on your project**
3. **Click "SQL Editor"**
4. **Paste your backup SQL and run it**

#### Option B: Using Prisma Studio

```bash
# Make sure your .env has the NEW Neon URLs
npx prisma studio

# Manually add your data through the visual interface
```

#### Option C: Using psql

```bash
psql "your-neon-connection-string" < backup.sql
```

---

### STEP 5: Delete Old Render Database

⚠️ **ONLY DO THIS AFTER VERIFYING YOUR DATA IS SAFE IN NEON!**

1. **Go to Render Dashboard**
2. **Find your old database**
3. **Click "Delete"**
4. **Type the database name to confirm**

---

## 🔧 Troubleshooting

### Error: "Can't reach database server"

- Check your connection strings are correct
- Make sure there's no typo in the URL
- Verify the database is not suspended (Neon auto-suspends after inactivity)

### Error: "Prisma schema validation error"

Run this:
```bash
npx prisma generate
npx prisma db push
```

### Error: "SSL connection required"

Add `?sslmode=require` to your connection string if not present.

---

## 📝 Quick Reference

### Useful Prisma Commands

```bash
# Generate Prisma client
npx prisma generate

# Push schema changes to database
npx prisma db push

# Open visual database editor
npx prisma studio

# View database data
npx prisma db pull

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Useful Neon Features

| Feature | Description |
|---------|-------------|
| **Auto-suspend** | Pauses after 5 min inactivity (saves resources) |
| **Branch** | Create a copy of your database for testing |
| **SQL Editor** | Run SQL queries directly in browser |
| **Monitoring** | View database usage and performance |

---

## ✅ Migration Checklist

- [ ] Created Neon account
- [ ] Created Neon project
- [ ] Copied connection strings
- [ ] Backed up old data from Render
- [ ] Updated local `.env` file
- [ ] Ran `npx prisma generate`
- [ ] Ran `npx prisma db push`
- [ ] Verified data in Neon
- [ ] Updated Render environment variables
- [ ] Redeployed on Render
- [ ] Verified app works on Render
- [ ] Deleted old Render database

---

## 🆘 Need Help?

If you get stuck:
1. Check Neon docs: https://neon.tech/docs
2. Check Prisma docs: https://www.prisma.io/docs
3. Ask in the project issues

---

**Good luck with your migration! 🎉**
