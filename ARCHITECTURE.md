# NeoStats Collaborative Project Management Platform - Architecture Specification

## Overview
NeoStats is a high-performance, multi-user real-time collaborative project management platform designed with role-based permission enforcement, optimistic locking concurrency control, real-time Socket.IO notifications, and structured audit activity logging.

## Core System Architecture

```
[ Next.js Frontend (App Router) ] <--- HTTP/REST + WebSockets ---> [ Express Backend Node.js Service ]
           |                                                                  |
    TanStack Query                                                     Prisma ORM
   React Hook Form                                                            |
     shadcn/ui                                                      [ PostgreSQL Database ]
```

## Security & Authorization Model
- **Authentication**: JWT token issued on login stored in an `httpOnly`, `SameSite=Lax`, `Secure` cookie.
- **Global vs. Project Permissions**:
  - **Global Roles**: `ADMIN`, `USER`. Admin bypasses project checks.
  - **Project-Level Roles**: `PROJECT_MANAGER`, `TEAM_MEMBER`, `VIEWER`.
- **Central Authorization Matrix**: A single declaration mapping `(role, action) => boolean` enforced by a server-side middleware `authorize(action)`.

## Concurrency Control
- **Optimistic Locking**: Every editable entity (specifically `Task`) carries an integer `version` field.
- Updates execute SQL atomic operations equivalent to:
  `UPDATE task SET title=$1, version=version+1 WHERE id=$2 AND version=$3`
- If 0 rows are updated, server rejects with HTTP 409 Conflict along with the latest state from DB.

## Real-Time & Event Engine
- **Socket.IO Server**: Authenticates socket handshakes via JWT cookie parsing.
- Rooms:
  - `user:{id}` - Private channel for direct notifications.
  - `project:{id}` - Broadcast channel for project/task mutations.

## Data Layer & Activity Log
- Activity logging via centralized `recordActivity()` service executing within DB transactions.
- Audit table logs `id`, `user_id`, `project_id`, `action`, `entity_type`, `entity_id`, `metadata` (JSONB), `created_at`.
