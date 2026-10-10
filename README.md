# NeoStats - Multi-User Collaborative Project Management Platform

## Project Structure
- `/backend` - Express + TypeScript + Prisma + Socket.IO server
- `/frontend` - Next.js (App Router) + TypeScript + Tailwind CSS + TanStack Query UI

## Quick Start
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example backend/.env
   ```
2. Start PostgreSQL container:
   ```bash
   docker-compose up -d
   ```
3. Install backend dependencies and seed database:
   ```bash
   cd backend
   npm install
   npx prisma migrate dev
   npm run seed
   npm run dev
   ```
4. Install frontend dependencies and run client:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```
