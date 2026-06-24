# MindShift: Parental Gate Architecture

## 1. The Onboarding Funnel (Paywall)
1. **The Hook:** Child arrives at the landing page (No Auth). Types 3 words to generate their monster.
2. **The Tease:** The system generates a blurred silhouette of the monster and plays a muffled sound.
3. **The Paywall:** Screen locks. "Activate your Monster to start learning. 29 AZN/month."
4. **Auth & Pay:** Parent registers via Clerk, pays via LemonSqueezy.
5. **The Aha Moment:** Post-payment, the screen explodes with light (Framer Motion spring) and the Monster is fully revealed.

## 2. The Proof of Learning (Dashboard)
- **The Problem:** Parents in CIS cancel subs if they don't see tangible educational value.
- **The Solution:** A dedicated Parent Dashboard behind Clerk Auth.
- **Weekly Email Report:** Every Friday, Resend fires an email to the parent: "This week, Ali learned IF/ELSE logic. Here is the actual prompt he wrote to his Monster: [Insert Prompt]."
- **Upsells:** The dashboard contains a button for parents to "Reward" their child by purchasing a 100 Crystal pack for 2 AZN.
