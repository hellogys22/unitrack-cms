# UniTrack CMS — Choice-Based Credit System & Prerequisite-Aware Course Management System

UniTrack CMS is a full-stack, Vercel-deployable academic Course Management System built for a BCA Software Engineering mini project using **Next.js (App Router, TypeScript)**, **Tailwind CSS**, **Prisma ORM**, and **PostgreSQL**.

## Core Software Engineering Features

- **3NF Normalized PostgreSQL Schema (`prisma/schema.prisma`):** Models `User`, `Course` (self-referencing prerequisites), `Enrollment` (unique `[studentId, courseId]`), and `Attendance` (unique `[enrollmentId, date]`).
- **Transactional Enrollment Validation Engine (`POST /api/enroll`):**
  1. **Prerequisite Check:** Verifies prerequisite course `Enrollment.status === 'COMPLETED'`.
  2. **24-Credit Semester Cap:** Rejects enrollments exceeding `24` active credits (`ENROLLED`).
  3. **Seat Capacity Check:** Rejects enrollment when active `ENROLLED` seats reach `maxSeats`.
  4. **Duplicate Prevention:** Rejects re-enrollment when already `ENROLLED` or `COMPLETED` (permits re-enrolling after `DROPPED`).
- **Safe Course Deletion (`DELETE /api/courses/[id]`):** Blocks deletion with HTTP `400` if any student is actively `ENROLLED`.
- **Dynamic Attendance Threshold (`< 75%` Alert):** Dynamically computes `(presentSessions / totalSessions) * 100` and flags students below `75%` across Student, Faculty, and Admin views.
- **1-Click Role-Based Demo Portals:** Instant HTTP-only cookie login for Admin (`Dr. R. Sharma`), Faculty (`Prof. A. Verma`), Fresh Student (`Priya Patel`), and Advanced Student (`Rahul Das`).

## Local Setup

### Option A: Zero-Config Local PostgreSQL (Prisma Local Postgres)
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start Prisma's built-in local PostgreSQL server (powered by PGlite, no Docker required):
   ```bash
   npx prisma dev -d -n unitrack
   ```
   Copy the connection URL printed by `prisma dev` into `.env` (for Prisma's local `prisma dev` server or PgBouncer poolers, append `?pgbouncer=true&connection_limit=1` to avoid prepared statement conflicts):
   ```env
   DATABASE_URL="postgres://postgres:postgres@127.0.0.1:51214/template1?sslmode=disable&pgbouncer=true&connection_limit=1"
   SESSION_SECRET="change-this-for-production"
   ```
3. Push the schema and seed the demo data:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### Option B: External Local or Hosted PostgreSQL (Neon / Supabase / Docker)
1. Copy `.env.example` to `.env` and set `DATABASE_URL` to your PostgreSQL connection string.
2. Run:
   ```bash
   npx prisma db push
   npx prisma db seed
   npm run dev
   ```

## Vercel Deployment Guide

1. Push this repository to GitHub and import it in the Vercel Dashboard.
2. Provision a PostgreSQL database (via **Vercel Storage / Prisma Postgres**, **Neon**, or **Supabase**).
3. In Vercel **Project Settings → Environment Variables**, configure:
   - `DATABASE_URL` — PostgreSQL connection string (`?sslmode=require` or pooler URL)
   - `SESSION_SECRET` — Random 32+ character signing string for HTTP-only session cookies
4. Build script is pre-configured in `package.json`:
   ```json
   "build": "prisma generate && next build"
   ```
5. After deploying, push the schema and seed your cloud database once from your terminal using your production `DATABASE_URL`:
   ```bash
   DATABASE_URL="your-production-postgres-url" npx prisma db push
   DATABASE_URL="your-production-postgres-url" npx prisma db seed
   ```

## Software Engineering Documentation

- [Entity-Relationship Diagram & Enrollment Flowchart](docs/ER_DIAGRAM.md)
- [Black-Box Functional Test Report (TC-01 to TC-08)](docs/TEST_REPORT.md)
