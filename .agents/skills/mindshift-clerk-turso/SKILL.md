---
name: mindshift-clerk-turso
description: Architecture constraints for Clerk Auth and Turso LibSQL.
---

# Clerk & Turso Architecture Rules

1. **Parental Gate:** Clerk is used for PARENTS. The primary account belongs to the adult.
2. **Child Profile:** The child's data (xp, crystals, activeStep) is linked to the Parent's Clerk ID in Turso.
3. **Database Driver:** Turso must use `@libsql/client` and `@prisma/adapter-libsql`.
4. **Middleware:** `clerkMiddleware` must protect all `/api/` routes except public webhooks (`/api/webhooks/*`).
5. **Relation Constraints:**
   - `User` 1:1 `Monster` (Cascade Delete).
   - `User` 1:N `LessonProgress` (Cascade Delete).
