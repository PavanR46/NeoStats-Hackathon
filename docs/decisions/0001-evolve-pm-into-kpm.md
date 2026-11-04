# ADR-0001: Evolve the project-management codebase into KPM
Date: 2026-10-16 | Status: accepted

## Context
Need ticketing, escalation and employee performance tracking.

## Decision
Extend the existing Express/Prisma/Next.js app instead of rewriting.

## Why (alternatives considered)
Auth, RBAC, optimistic locking, audit log, notifications and sockets already
exist and are tested. A rewrite would repeat that work and its bugs.

## Consequences
Domain renames (Project->Team, Task->Ticket) needed, done as a separate refactor PR.