# MindShift: Business & Legal Architecture

## 1. Positioning & Market
**Core Audience:** Children 8-14 in Azerbaijan and CIS.
**Buyer Persona:** Parents willing to pay for supplementary IT education.
**Value Proposition:** "Teach your child how to command AI, not just consume it."
**Cultural Framing:** Positioned as a "productivity and focus tool" (Respects Energy) rather than a clinical "ADHD accommodation".

## 2. Pricing Model (LemonSqueezy)
- **Currency:** AZN (Azerbaijani Manat).
- **Tier 1 (Base):** 29 AZN / month. Asynchronous AI pet interaction.
- **Tier 2 (Standard):** 89 AZN / month. Includes human-led cohort checkpoints.
- **Microtransactions:** 2 AZN for 100 Crystals (Gated behind Parent Dashboard).

## 3. Legal & Compliance (GDPR & AZ PDPA)
1. **Age Verification:** Hard COPPA/GDPR boundary. Users under 16 require explicit parental consent via Clerk.
2. **Biometric Data (Voice):** Audio clips sent to TTS/STT are classified as biometric under AZ PDPA Article 8. 
   - **Rule:** Audio must be processed entirely in-memory or deleted within 48 hours. No retention.
3. **Data Minimization:** No PII (names, emails) is sent to OpenAI. Prompts are sanitized locally before dispatch.
4. **Trust Delivery:** The AZ market demands value before data. Users test the monster generation *before* providing an email.
