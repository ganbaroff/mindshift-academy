---
name: mindshift-lemonsqueezy
description: Core billing rules for MindShift using LemonSqueezy in AZN.
---

# LemonSqueezy Integration Rules for MindShift

1. **Currency:** All prices MUST be displayed in AZN (Azerbaijani Manat), but processed via standard LemonSqueezy API.
2. **Webhooks:** Webhooks must verify `x-signature` using `crypto.createHmac` against `LEMONSQUEEZY_WEBHOOK_SECRET`.
3. **Product Tiers:**
   - Base: 29 AZN / month (Async AI only).
   - Standard: 89 AZN / month (Cohort + Mentor).
4. **Crystals (Monetization):** One-off payments for Crystals (100💎, 500💎) must use LemonSqueezy checkout links attached to the parent's email.
5. **No Client-side keys:** LemonSqueezy API calls must only happen in `/api/*` routes.
