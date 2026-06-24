# MindShift: DevOps & Deployment Architecture

## 1. Hosting (Vercel)
- **Deployment:** Vercel (Hobby tier for MVP, scaling to Pro).
- **Edge Routing:** Use Vercel Edge functions for the Upstash Rate Limiting middleware to prevent OpenAI abuse.

## 2. Database & Caching
- **Primary DB:** Turso (LibSQL). Since Turso is edge-ready, we will keep the primary database in Europe (Frankfurt) to minimize latency for Azerbaijan/CIS users.
- **Caching/Rate Limiting:** Upstash Redis. Used to track IP addresses to limit the Chat route to 10 requests per 10 seconds.

## 3. CI/CD & Background Jobs (GitHub Actions)
- **CI Pipeline:** Run `npm run lint` and `tsc --noEmit` on every Pull Request.
- **Nightly Tamagotchi Cron:** 
  - Vercel Cron or GitHub Actions will fire a secured HTTP request to an internal `/api/cron/tamagotchi-decay` endpoint every day at Midnight (AZT).
  - This endpoint will decrement `petMood` by 25 for all users who did not log in that day.

## 4. Monitoring & Analytics
- **Analytics:** PostHog (event tracking for the Gacha funnel and Retention drop-offs).
- **Error Tracking:** Vercel Logs (MVP) -> Sentry (Post-MVP).
